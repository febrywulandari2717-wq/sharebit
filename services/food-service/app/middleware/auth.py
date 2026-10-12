from functools import wraps

import jwt
from flask import current_app, g, request

from ..utils.errors import AppError

_key_cache = {}


def _public_key():
    path = current_app.config["JWT_PUBLIC_KEY_PATH"]
    if path not in _key_cache:
        try:
            with open(path, "rb") as f:
                _key_cache[path] = f.read()
        except OSError:
            raise AppError(
                "INTERNAL_ERROR",
                "Kunci publik JWT tidak ditemukan. Jalankan: node scripts/generate-keys.js",
                500,
            )
    return _key_cache[path]


def verify_jwt(token):
    try:
        return jwt.decode(
            token,
            _public_key(),
            algorithms=["RS256"],
            issuer=current_app.config["JWT_ISSUER"],
            audience=current_app.config["JWT_AUDIENCE"],
        )
    except jwt.ExpiredSignatureError:
        raise AppError("UNAUTHENTICATED", "Token kedaluwarsa.", 401)
    except jwt.InvalidTokenError:
        raise AppError("UNAUTHENTICATED", "Token tidak valid.", 401)


def require_auth(*roles):
    """Wajib login. Jika roles diberikan, role pengguna harus termasuk di dalamnya."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                raise AppError("UNAUTHENTICATED", "Header Authorization tidak ada.", 401)
            payload = verify_jwt(header[7:].strip())
            try:
                g.user_id = int(payload.get("sub"))
            except (TypeError, ValueError):
                raise AppError("UNAUTHENTICATED", "Token tidak valid.", 401)
            g.role = payload.get("role")
            if roles and g.role not in roles:
                raise AppError("FORBIDDEN", "Anda tidak punya akses.", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator
