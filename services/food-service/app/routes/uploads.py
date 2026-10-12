import os

from flask import Blueprint, current_app, send_from_directory

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.get("/uploads/foods/<path:filename>")
def serve_food_image(filename):
    folder = os.path.join(current_app.config["UPLOAD_DIR"], "foods")
    return send_from_directory(folder, filename)
