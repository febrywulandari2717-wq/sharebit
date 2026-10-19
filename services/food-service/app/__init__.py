import os

import pymysql
from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db


def ensure_database(config):
    """Membuat database jika belum ada (praktis untuk XAMPP lokal)."""
    try:
        conn = pymysql.connect(
            host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER, password=config.DB_PASSWORD
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{config.DB_NAME}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[food-service] Peringatan: gagal memastikan database ada: {exc}")


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r"/*": {"origins": "*"}})

    ensure_database(config_class)
    db.init_app(app)

    from .routes.categories import categories_bp
    from .routes.foods import foods_bp
    from .routes.health import health_bp
    from .routes.internal_reservations import internal_bp
    from .routes.public import public_bp
    from .routes.uploads import uploads_bp
    from .utils.errors import register_error_handlers

    app.register_blueprint(health_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(categories_bp, url_prefix="/api/v1")
    app.register_blueprint(foods_bp, url_prefix="/api/v1")
    app.register_blueprint(public_bp, url_prefix="/api/v1/public")
    app.register_blueprint(internal_bp, url_prefix="/internal/v1")
    register_error_handlers(app)

    os.makedirs(os.path.join(app.config["UPLOAD_DIR"], "foods"), exist_ok=True)

    with app.app_context():
        from . import models  # noqa: F401

        db.create_all()
        models.ensure_columns()
        models.seed_categories()

    return app
