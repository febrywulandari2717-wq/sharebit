from flask import Blueprint, jsonify

from ..extensions import db
from ..middleware.auth import require_auth
from ..models import Category

categories_bp = Blueprint("categories", __name__)


@categories_bp.get("/categories")
@require_auth()
def list_categories():
    rows = db.session.query(Category).order_by(Category.id.asc()).all()
    return jsonify({"data": [c.to_dict() for c in rows]})
