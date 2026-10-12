from tests.conftest import make_token


def test_requires_token(client):
    r = client.get("/api/v1/foods")
    assert r.status_code == 401
    assert r.get_json()["error"]["code"] == "UNAUTHENTICATED"


def test_rejects_expired_token(client):
    t = make_token(5, "donor", expires_in=-10)
    r = client.get("/api/v1/foods", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 401


def test_rejects_wrong_issuer(client):
    t = make_token(5, "donor", issuer="penyerang")
    r = client.get("/api/v1/foods", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 401


def test_rejects_garbage_token(client):
    r = client.get("/api/v1/foods", headers={"Authorization": "Bearer abc.def.ghi"})
    assert r.status_code == 401


def test_categories_seeded(client, recipient):
    r = client.get("/api/v1/categories", headers=recipient)
    assert r.status_code == 200
    names = [c["name"] for c in r.get_json()["data"]]
    assert len(names) == 6 and "Makanan Berat" in names
