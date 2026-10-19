"""Endpoint publik (tanpa login) untuk halaman beranda & penjelajahan makanan."""
from flask import Blueprint, jsonify, request
from sqlalchemy import func

from ..extensions import db
from ..models import Category, Food, Reservation
from ..utils.errors import AppError
from ..utils.time import utcnow
from .foods import query_foods

public_bp = Blueprint("public", __name__)


@public_bp.get("/foods")
def public_foods():
    return jsonify(query_foods(request.args, "public"))


@public_bp.get("/foods/<int:food_id>")
def public_food(food_id):
    food = db.session.get(Food, food_id)
    if not food or food.is_deleted:
        raise AppError("NOT_FOUND", "Makanan tidak ditemukan.", 404)
    return jsonify({"data": food.to_dict()})


@public_bp.get("/categories")
def public_categories():
    rows = db.session.query(Category).order_by(Category.id.asc()).all()
    return jsonify({"data": [c.to_dict() for c in rows]})


@public_bp.get("/stats")
def public_stats():
    """Statistik nyata dari database; tidak ada angka rekaan."""
    now = utcnow()
    live = (Food.is_deleted.is_(False), Food.status == "available", Food.expires_at > now, Food.quantity_available > 0)
    available_foods = db.session.query(func.count(Food.id)).filter(*live).scalar() or 0
    available_portions = db.session.query(func.coalesce(func.sum(Food.quantity_available), 0)).filter(*live).scalar() or 0
    total_foods = db.session.query(func.count(Food.id)).filter(Food.is_deleted.is_(False)).scalar() or 0
    reserved = (
        db.session.query(func.coalesce(func.sum(Reservation.quantity), 0))
        .filter(Reservation.status.in_(["held", "confirmed"]))
        .scalar()
        or 0
    )
    popular = (
        db.session.query(Category.id, Category.name, func.count(Food.id))
        .join(Food, Food.category_id == Category.id)
        .filter(Food.is_deleted.is_(False))
        .group_by(Category.id, Category.name)
        .order_by(func.count(Food.id).desc())
        .limit(6)
        .all()
    )
    return jsonify(
        {
            "data": {
                "available_foods": int(available_foods),
                "available_portions": int(available_portions),
                "total_foods": int(total_foods),
                "reserved_portions": int(reserved),
                "popular_categories": [{"id": i, "name": n, "foods": int(c)} for i, n, c in popular],
            }
        }
    )
