import os
import tempfile
import time

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

# Environment HARUS diset sebelum modul app diimpor
_tmp = tempfile.mkdtemp(prefix="sharebite-food-test-")
_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_pub_path = os.path.join(_tmp, "jwt_public.pem")
with open(_pub_path, "wb") as f:
    f.write(
        _key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
    )
_private_pem = _key.private_bytes(
    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
)

os.environ["DB_NAME"] = os.getenv("TEST_DB_NAME", "sharebite_food_test")
os.environ["JWT_PUBLIC_KEY_PATH"] = _pub_path
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["REQUEST_SERVICE_KEY"] = "test-service-key"

SERVICE_KEY = "test-service-key"


def make_token(user_id, role, expires_in=900, issuer="sharebite-identity"):
    now = int(time.time())
    payload = {
        "iss": issuer,
        "aud": "sharebite-api",
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + expires_in,
    }
    return jwt.encode(payload, _private_pem, algorithm="RS256")


@pytest.fixture(scope="session")
def app():
    from app import create_app
    from app.extensions import db

    application = create_app()
    application.config["TESTING"] = True
    with application.app_context():
        db.drop_all()
        db.create_all()
        from app.models import seed_categories

        seed_categories()
    yield application


@pytest.fixture()
def client(app):
    return app.test_client()


def auth(user_id, role):
    return {"Authorization": f"Bearer {make_token(user_id, role)}"}


@pytest.fixture()
def donor():
    return auth(10, "donor")


@pytest.fixture()
def donor2():
    return auth(11, "donor")


@pytest.fixture()
def recipient():
    return auth(20, "recipient")


@pytest.fixture()
def admin():
    return auth(1, "admin")


@pytest.fixture()
def service_headers():
    return {"X-Service-Key": SERVICE_KEY}


def food_payload(**over):
    from datetime import datetime, timedelta, timezone

    base = datetime.now(timezone.utc) + timedelta(hours=2)
    data = {
        "title": "Nasi Kotak Ayam",
        "description": "Sisa acara kantor",
        "category_id": 1,
        "quantity_total": 10,
        "max_per_request": 3,
        "pickup_location": "Jl. Veteran No. 5, Gresik",
        "pickup_start": base.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pickup_end": (base + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "expires_at": (base + timedelta(hours=4)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    data.update(over)
    return data


@pytest.fixture()
def make_food(client, donor):
    def _make(**over):
        r = client.post("/api/v1/foods", json=food_payload(**over), headers=donor)
        assert r.status_code == 201, r.get_json()
        return r.get_json()["data"]

    return _make
