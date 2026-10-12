"""Endpoint internal untuk Request Service (dilindungi X-Service-Key)."""
from datetime import timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..middleware.service_key import require_service_key
from ..models import Food, Reservation
from ..utils.errors import AppError
from ..utils.time import utcnow

internal_bp = Blueprint("internal_reservations", __name__)

HOLD_HOURS = 24


def _is_uuid(value):
    return isinstance(value, str) and len(value) == 36 and value.count("-") == 4


@internal_bp.post("/foods/<int:food_id>/reservations")
@require_service_key
def create_reservation(food_id):
    data = request.get_json(silent=True) or {}
    request_id = data.get("request_id")
    if not _is_uuid(request_id):
        raise AppError("VALIDATION_ERROR", "request_id harus UUID.", 422, {"request_id": ["UUID tidak valid."]})
    try:
        quantity = int(data.get("quantity"))
        if quantity < 1:
            raise ValueError
    except (TypeError, ValueError):
        raise AppError("VALIDATION_ERROR", "quantity harus bilangan bulat >= 1.", 422, {"quantity": ["Minimal 1."]})
    recipient_id = data.get("recipient_id")

    # Idempoten: request_id yang sama dengan data sama -> hasil yang sama
    existing = db.session.query(Reservation).filter_by(request_id=request_id).first()
    if existing:
        if existing.food_id != food_id or existing.quantity != quantity:
            raise AppError("IDEMPOTENCY_CONFLICT", "request_id sudah dipakai dengan data berbeda.", 409)
        return jsonify({"data": existing.to_dict()}), 200

    food = db.session.get(Food, food_id)
    if not food or food.is_deleted:
        raise AppError("NOT_FOUND", "Makanan tidak ditemukan.", 404)
    if recipient_id is not None and str(recipient_id) == str(food.donor_id):
        raise AppError("VALIDATION_ERROR", "Anda tidak bisa meminta makanan milik sendiri.", 422)
    food.refresh_status()
    if food.status != "available":
        db.session.commit()
        raise AppError("FOOD_NOT_AVAILABLE", "Makanan sudah tidak tersedia.", 409)
    if food.max_per_request and quantity > food.max_per_request:
        raise AppError(
            "VALIDATION_ERROR",
            f"Maksimal {food.max_per_request} per permintaan.",
            422,
            {"quantity": [f"Maksimal {food.max_per_request}."]},
        )

    try:
        # Pengurangan stok atomik: gagal jika stok tidak cukup (mencegah stok negatif)
        result = db.session.execute(
            text(
                "UPDATE foods SET quantity_available = quantity_available - :qty, updated_at = :now "
                "WHERE id = :fid AND quantity_available >= :qty AND is_deleted = 0 AND status = 'available'"
            ),
            {"qty": quantity, "fid": food_id, "now": utcnow()},
        )
        if result.rowcount == 0:
            db.session.rollback()
            raise AppError("INSUFFICIENT_STOCK", "Stok tidak cukup.", 409)
        reservation = Reservation(
            request_id=request_id,
            food_id=food_id,
            quantity=quantity,
            status="held",
            donor_id=food.donor_id,
            food_title=food.title,
            expires_at=utcnow() + timedelta(hours=HOLD_HOURS),
        )
        db.session.add(reservation)
        db.session.commit()
    except IntegrityError:
        # request_id yang sama masuk bersamaan: transaksi dibatalkan, kembalikan yang sudah ada
        db.session.rollback()
        existing = db.session.query(Reservation).filter_by(request_id=request_id).first()
        if existing:
            return jsonify({"data": existing.to_dict()}), 200
        raise

    food = db.session.get(Food, food_id)
    db.session.refresh(food)
    food.refresh_status()
    db.session.commit()
    return jsonify({"data": reservation.to_dict()}), 201


@internal_bp.post("/reservations/<request_id>/confirm")
@require_service_key
def confirm_reservation(request_id):
    res = db.session.query(Reservation).filter_by(request_id=request_id).first()
    if not res:
        raise AppError("NOT_FOUND", "Reservasi tidak ditemukan.", 404)
    if res.status == "released":
        raise AppError("CONFLICT", "Reservasi sudah dilepas.", 409)
    if res.status == "held":
        res.status = "confirmed"
        db.session.commit()
    return jsonify({"data": res.to_dict()})


@internal_bp.post("/reservations/<request_id>/release")
@require_service_key
def release_reservation(request_id):
    res = db.session.query(Reservation).filter_by(request_id=request_id).first()
    if not res:
        raise AppError("NOT_FOUND", "Reservasi tidak ditemukan.", 404)
    if res.status == "released":
        return jsonify({"data": res.to_dict()})

    # Kunci baris reservasi dulu agar pelepasan ganda tidak mengembalikan stok dua kali
    claimed = db.session.execute(
        text("UPDATE reservations SET status = 'released', updated_at = :now WHERE id = :id AND status <> 'released'"),
        {"now": utcnow(), "id": res.id},
    )
    if claimed.rowcount == 1:
        db.session.execute(
            text(
                "UPDATE foods SET quantity_available = LEAST(quantity_total, quantity_available + :qty), "
                "updated_at = :now WHERE id = :fid"
            ),
            {"qty": res.quantity, "fid": res.food_id, "now": utcnow()},
        )
    db.session.commit()

    db.session.expire_all()
    food = db.session.get(Food, res.food_id)
    if food:
        food.refresh_status()
        db.session.commit()
    res = db.session.query(Reservation).filter_by(request_id=request_id).first()
    return jsonify({"data": res.to_dict()})
