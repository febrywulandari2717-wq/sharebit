import os

from dotenv import load_dotenv

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(ROOT_DIR, ".env"))


def resolve_path(path):
    """Path relatif dihitung dari folder food-service."""
    if os.path.isabs(path):
        return path
    return os.path.normpath(os.path.join(ROOT_DIR, path))


class Config:
    ROOT_DIR = ROOT_DIR
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "sharebite_food")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    JWT_PUBLIC_KEY_PATH = resolve_path(os.getenv("JWT_PUBLIC_KEY_PATH", "../../keys/jwt_public.pem"))
    JWT_ISSUER = os.getenv("JWT_ISSUER", "sharebite-identity")
    JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "sharebite-api")

    REQUEST_SERVICE_KEY = os.getenv("REQUEST_SERVICE_KEY", "request-secret-key-2026")

    UPLOAD_DIR = resolve_path(os.getenv("UPLOAD_DIR", "uploads"))
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", "2097152"))
