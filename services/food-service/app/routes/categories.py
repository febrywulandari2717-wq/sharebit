from flask import Blueprint, jsonify, request

from ..extensions import db
from ..middleware.auth import require_auth
from ..models import Category, Food
from ..utils.audit import audit
from ..utils.errors import AppError

categories_bp = Blueprint("categories", __name__)


def _name(data):
    name = str((data or {}).get("name") or "").strip()
    if not 2 <= len(name) <= 80:
        raise AppError("VALIDATION_ERROR", "Data tidak valid.", 422, {"name": ["Panjang 2-80 karakter."]})
    return name


@categories_bp.get("/categories")
@require_auth()
def list_categories():
    rows = db.session.query(Category).order_by(Category.id.asc()).all()
    return jsonify({"data": [c.to_dict() for c in rows]})


@categories_bp.post("/categories")
@require_auth("admin")
def create_category():
    name = _name(request.get_json(silent=True))
    if db.session.query(Category).filter(Category.name == name).first():
        raise AppError("CONFLICT", "Nama kategori sudah ada.", 409)
    c = Category(name=name)
    db.session.add(c)
    db.session.commit()
    audit("category.create", "category", c.id, name=name)
    return jsonify({"data": c.to_dict()}), 201


@categories_bp.patch("/categories/<int:cid>")
@require_auth("admin")
def update_category(cid):
    c = db.session.get(Category, cid) or (_ for _ in ()).throw(AppError("NOT_FOUND", "Kategori tidak ditemukan.", 404))
    name = _name(request.get_json(silent=True))
    dup = db.session.query(Category).filter(Category.name == name, Category.id != cid).first()
    if dup:
        raise AppError("CONFLICT", "Nama kategori sudah ada.", 409)
    old = c.name
    c.name = name
    db.session.commit()
    audit("category.update", "category", c.id, old=old, new=name)
    return jsonify({"data": c.to_dict()})


@categories_bp.delete("/categories/<int:cid>")
@require_auth("admin")
def delete_category(cid):
    c = db.session.get(Category, cid) or (_ for _ in ()).throw(AppError("NOT_FOUND", "Kategori tidak ditemukan.", 404))
    used = db.session.query(Food.id).filter(Food.category_id == cid, Food.is_deleted.is_(False)).first()
    if used:
        raise AppError("CONFLICT", "Kategori masih dipakai makanan aktif.", 409)
    db.session.delete(c)
    db.session.commit()
    audit("category.delete", "category", cid, name=c.name)
    return "", 204
