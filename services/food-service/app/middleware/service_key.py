import hmac
from functools import wraps

from flask import current_app, request

from ..utils.errors import AppError


def require_service_key(fn):
    """Endpoint internal: wajib header X-Service-Key yang cocok."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        given = request.headers.get("X-Service-Key", "")
        expected = current_app.config["REQUEST_SERVICE_KEY"]
        if not given or not hmac.compare_digest(given, expected):
            raise AppError("UNAUTHENTICATED", "X-Service-Key tidak valid.", 401)
        return fn(*args, **kwargs)

    return wrapper
