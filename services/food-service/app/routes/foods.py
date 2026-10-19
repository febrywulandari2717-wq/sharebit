from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import func, or_, literal

from ..extensions import db
from ..middleware.auth import require_auth
from ..models import Category, Food, Reservation
from ..utils.audit import audit
from ..utils.errors import AppError
from ..utils.image_upload import save_food_image
from ..utils.pagination import build_meta, get_pagination_args
from ..utils.time import utcnow

foods_bp = Blueprint("foods", __name__)


def parse_dt(value, field, errors):
    """Parse ISO 8601 (boleh berakhiran Z / offset) menjadi UTC tanpa tzinfo."""
    if value in (None, ""):
        errors[field] = ["Wajib diisi."]
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        errors[field] = ["Format harus ISO 8601, contoh 2026-10-12T10:00:00Z."]
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def to_int(value, field, errors, minimum, maximum=None):
    try:
        n = int(value)
    except (TypeError, ValueError):
        errors[field] = ["Harus berupa angka bulat."]
        return None
    if n < minimum or (maximum is not None and n > maximum):
        rng = f"{minimum}-{maximum}" if maximum else f">= {minimum}"
        errors[field] = [f"Harus {rng}."]
        return None
    return n


def validate_food(data, food=None):
    """Validasi payload create (food=None) atau update parsial. Mengembalikan dict nilai bersih."""
    partial = food is not None
    errors, out = {}, {}

    def has(k):
        return (not partial) or (k in data)

    if has("title"):
        title = str(data.get("title") or "").strip()
        if not 3 <= len(title) <= 120:
            errors["title"] = ["Panjang 3-120 karakter."]
        out["title"] = title
    if has("description"):
        desc = data.get("description")
        if desc is not None and len(str(desc)) > 2000:
            errors["description"] = ["Maksimal 2000 karakter."]
        out["description"] = desc
    if has("category_id"):
        cid = to_int(data.get("category_id"), "category_id", errors, 1)
        if cid is not None and not db.session.get(Category, cid):
            errors["category_id"] = ["Kategori tidak ditemukan."]
        out["category_id"] = cid
    if has("quantity_total"):
        out["quantity_total"] = to_int(data.get("quantity_total"), "quantity_total", errors, 1, 1000)
    if "max_per_request" in data:
        mpr = data.get("max_per_request")
        out["max_per_request"] = None if mpr in (None, "") else to_int(mpr, "max_per_request", errors, 1)
    if has("unit"):
        unit = str(data.get("unit") or "porsi").strip()
        if len(unit) > 30:
            errors["unit"] = ["Maksimal 30 karakter."]
        out["unit"] = unit
    if has("pickup_location"):
        loc = str(data.get("pickup_location") or "").strip()
        if not 5 <= len(loc) <= 255:
            errors["pickup_location"] = ["Panjang 5-255 karakter."]
        out["pickup_location"] = loc
    for k in ("allergens", "storage_info"):
        if k in data:
            v = data.get(k)
            if v is not None and len(str(v)) > 255:
                errors[k] = ["Maksimal 255 karakter."]
            out[k] = v or None
    for k in ("latitude", "longitude"):
        if k in data:
            v = data.get(k)
            if v in (None, ""):
                out[k] = None
                continue
            try:
                f = float(v)
            except (TypeError, ValueError):
                errors[k] = ["Harus berupa angka."]
                continue
            lim = 90 if k == "latitude" else 180
            if not -lim <= f <= lim:
                errors[k] = [f"Harus antara -{lim} dan {lim}."]
            out[k] = f
    if ("latitude" in out) != ("longitude" in out) and not partial:
        errors.setdefault("latitude", ["Isi latitude dan longitude bersamaan."])
    for k in ("pickup_start", "pickup_end", "expires_at"):
        if has(k):
            out[k] = parse_dt(data.get(k), k, errors)

    # Konsistensi waktu & jumlah memakai nilai baru, atau nilai lama saat update parsial
    def final(k):
        return out[k] if k in out else (getattr(food, k) if food else None)

    ps, pe, ea = final("pickup_start"), final("pickup_end"), final("expires_at")
    if ps and pe and ps >= pe and "pickup_end" not in errors:
        errors["pickup_end"] = ["Harus setelah pickup_start."]
    if pe and ea and pe > ea and "expires_at" not in errors:
        errors["expires_at"] = ["Harus sama atau setelah pickup_end."]
    if "expires_at" in out and out["expires_at"] and out["expires_at"] <= utcnow():
        errors["expires_at"] = ["Harus di masa depan."]
    qt, mpr = final("quantity_total"), final("max_per_request")
    if qt and mpr and mpr > qt and "max_per_request" not in errors:
        errors["max_per_request"] = ["Tidak boleh melebihi quantity_total."]

    if errors:
        raise AppError("VALIDATION_ERROR", "Data tidak valid.", 422, errors)
    return out


def get_owned_food(food_id):
    food = db.session.get(Food, food_id)
    if not food or food.is_deleted:
        raise AppError("NOT_FOUND", "Makanan tidak ditemukan.", 404)
    if g.role != "admin" and food.donor_id != g.user_id:
        raise AppError("FORBIDDEN", "Anda bukan pemilik makanan ini.", 403)
    return food


def reserved_quantity(food_id):
    total = (
        db.session.query(func.coalesce(func.sum(Reservation.quantity), 0))
        .filter(Reservation.food_id == food_id, Reservation.status.in_(["held", "confirmed"]))
        .scalar()
    )
    return int(total or 0)


def haversine_km(lat, lng):
    """Ekspresi SQL jarak (km) dari titik (lat, lng) ke koordinat makanan."""
    la, ln = literal(lat), literal(lng)
    cosine = (
        func.cos(func.radians(la)) * func.cos(func.radians(Food.latitude))
        * func.cos(func.radians(Food.longitude) - func.radians(ln))
        + func.sin(func.radians(la)) * func.sin(func.radians(Food.latitude))
    )
    return 6371.0 * func.acos(func.least(1.0, func.greatest(-1.0, cosine)))


def query_foods(args, scope):
    """Membangun daftar makanan. scope: 'public' | 'mine' | 'all' | 'catalog'."""
    q = (args.get("q") or "").strip()
    category_id = args.get("category_id")
    status = args.get("status")
    sort = args.get("sort", "newest")
    page, per_page = get_pagination_args(request)

    query = db.session.query(Food).filter(Food.is_deleted.is_(False))
    if scope == "mine":
        query = query.filter(Food.donor_id == g.user_id)
    elif scope != "all":
        query = query.filter(Food.status == "available", Food.expires_at > utcnow(), Food.quantity_available > 0)

    if q:
        like = f"%{q}%"
        query = query.filter(or_(Food.title.like(like), Food.description.like(like), Food.pickup_location.like(like)))
    if category_id:
        try:
            query = query.filter(Food.category_id == int(category_id))
        except ValueError:
            raise AppError("VALIDATION_ERROR", "category_id tidak valid.", 422)
    if status:
        if status not in ("available", "out_of_stock", "expired", "closed"):
            raise AppError("VALIDATION_ERROR", "status tidak valid.", 422)
        query = query.filter(Food.status == status)

    errors = {}
    for key, field in (("expires_before", Food.expires_at), ("pickup_before", Food.pickup_end)):
        if args.get(key):
            dt = parse_dt(args.get(key), key, errors)
            if dt:
                query = query.filter(field <= dt)
    if errors:
        raise AppError("VALIDATION_ERROR", "Filter tidak valid.", 422, errors)

    distance = None
    if args.get("lat") and args.get("lng"):
        try:
            lat, lng = float(args["lat"]), float(args["lng"])
        except ValueError:
            raise AppError("VALIDATION_ERROR", "lat/lng harus angka.", 422)
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise AppError("VALIDATION_ERROR", "lat/lng di luar rentang.", 422)
        distance = haversine_km(lat, lng)
        query = query.filter(Food.latitude.isnot(None), Food.longitude.isnot(None))
        if args.get("radius_km"):
            try:
                query = query.filter(distance <= float(args["radius_km"]))
            except ValueError:
                raise AppError("VALIDATION_ERROR", "radius_km harus angka.", 422)
    if args.get("has_coords", "").lower() == "true":
        query = query.filter(Food.latitude.isnot(None), Food.longitude.isnot(None))

    if sort == "distance" and distance is not None:
        order = [distance.asc(), Food.id.desc()]
    elif sort == "expires_soon":
        order = [Food.expires_at.asc(), Food.id.desc()]
    else:
        order = [Food.created_at.desc(), Food.id.desc()]
    total = query.count()
    if distance is not None:
        rows = query.add_columns(distance.label("d")).order_by(*order).offset((page - 1) * per_page).limit(per_page).all()
        items = []
        for food, d in rows:
            item = food.to_dict()
            item["distance_km"] = round(float(d), 2) if d is not None else None
            items.append(item)
    else:
        items = [f.to_dict() for f in query.order_by(*order).offset((page - 1) * per_page).limit(per_page).all()]
    return {"data": items, "meta": build_meta(page, per_page, total)}


@foods_bp.get("/foods")
@require_auth()
def list_foods():
    mine = request.args.get("mine", "false").lower() == "true"
    show_all = request.args.get("all", "false").lower() == "true"
    if mine:
        if g.role not in ("donor", "admin"):
            raise AppError("FORBIDDEN", "Hanya donor yang punya daftar makanan sendiri.", 403)
        scope = "mine"
    elif show_all and g.role == "admin":
        scope = "all"
    else:
        scope = "catalog"
    return jsonify(query_foods(request.args, scope))


@foods_bp.get("/foods/stats")
@require_auth("admin")
def foods_stats():
    rows = (
        db.session.query(Food.status, func.count(Food.id)).filter(Food.is_deleted.is_(False)).group_by(Food.status).all()
    )
    stock = (
        db.session.query(func.coalesce(func.sum(Food.quantity_available), 0))
        .filter(Food.is_deleted.is_(False), Food.status == "available")
        .scalar()
    )
    by_status = {s: int(c) for s, c in rows}
    return jsonify(
        {"data": {"total": sum(by_status.values()), "by_status": by_status, "total_available_stock": int(stock or 0)}}
    )


@foods_bp.get("/foods/<int:food_id>")
@require_auth()
def get_food(food_id):
    food = db.session.get(Food, food_id)
    if not food or food.is_deleted:
        raise AppError("NOT_FOUND", "Makanan tidak ditemukan.", 404)
    return jsonify({"data": food.to_dict()})


@foods_bp.post("/foods")
@require_auth("donor", "admin")
def create_food():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise AppError("VALIDATION_ERROR", "Body harus berupa JSON.", 422)
    v = validate_food(data)
    food = Food(
        donor_id=g.user_id,
        category_id=v["category_id"],
        title=v["title"],
        description=v.get("description"),
        quantity_total=v["quantity_total"],
        quantity_available=v["quantity_total"],
        unit=v.get("unit") or "porsi",
        max_per_request=v.get("max_per_request"),
        pickup_location=v["pickup_location"],
        pickup_start=v["pickup_start"],
        pickup_end=v["pickup_end"],
        expires_at=v["expires_at"],
        allergens=v.get("allergens"),
        storage_info=v.get("storage_info"),
        latitude=v.get("latitude"),
        longitude=v.get("longitude"),
        status="available",
    )
    db.session.add(food)
    db.session.commit()
    return jsonify({"data": food.to_dict()}), 201


@foods_bp.patch("/foods/<int:food_id>")
@require_auth("donor", "admin")
def update_food(food_id):
    food = get_owned_food(food_id)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise AppError("VALIDATION_ERROR", "Body harus berupa JSON.", 422)
    v = validate_food(data, food)

    if "quantity_total" in v:
        reserved = reserved_quantity(food.id)
        if v["quantity_total"] < reserved:
            raise AppError("CONFLICT", f"quantity_total tidak boleh kurang dari jumlah terpesan ({reserved}).", 409)
        food.quantity_available = v["quantity_total"] - reserved
    for k, val in v.items():
        setattr(food, k, val)

    if "status" in data:
        if data["status"] not in ("available", "closed"):
            raise AppError("VALIDATION_ERROR", "status hanya boleh available atau closed.", 422,
                           {"status": ["Pilih available atau closed."]})
        food.status = data["status"]
    food.refresh_status()
    db.session.commit()
    if food.donor_id != g.user_id:
        audit("food.update", "food", food.id, fields=sorted(data.keys()), status=food.status)
    return jsonify({"data": food.to_dict()})


@foods_bp.delete("/foods/<int:food_id>")
@require_auth("donor", "admin")
def delete_food(food_id):
    food = get_owned_food(food_id)
    held = (
        db.session.query(Reservation.id).filter(Reservation.food_id == food.id, Reservation.status == "held").first()
    )
    if held:
        raise AppError("CONFLICT", "Masih ada permintaan yang menunggu keputusan untuk makanan ini.", 409)
    food.is_deleted = True
    db.session.commit()
    if food.donor_id != g.user_id:
        audit("food.delete", "food", food.id, title=food.title)
    return "", 204


@foods_bp.post("/foods/<int:food_id>/image")
@require_auth("donor", "admin")
def upload_food_image(food_id):
    food = get_owned_food(food_id)
    if "image" not in request.files:
        raise AppError("VALIDATION_ERROR", "Field 'image' wajib diisi (multipart/form-data).", 422)
    food.image_url = save_food_image(request.files["image"], food.id, current_app.config["UPLOAD_DIR"])
    db.session.commit()
    return jsonify({"data": food.to_dict()})
