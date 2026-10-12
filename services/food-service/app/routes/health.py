from flask import Blueprint, jsonify
from sqlalchemy import text

from ..extensions import db

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
        ok = True
    except Exception:  # noqa: BLE001
        ok = False
    return (
        jsonify(
            {"data": {"status": "ok" if ok else "degraded", "service": "food", "database": "up" if ok else "down"}}
        ),
        200 if ok else 503,
    )
