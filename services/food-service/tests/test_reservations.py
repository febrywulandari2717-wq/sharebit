import uuid

BASE = "/internal/v1"


def reserve(client, headers, food_id, qty, rid=None, recipient_id=20):
    rid = rid or str(uuid.uuid4())
    r = client.post(
        f"{BASE}/foods/{food_id}/reservations",
        json={"request_id": rid, "quantity": qty, "recipient_id": recipient_id},
        headers=headers,
    )
    return rid, r


def get_food(client, recipient, food_id):
    return client.get(f"/api/v1/foods/{food_id}", headers=recipient).get_json()["data"]


def test_requires_service_key(client, make_food):
    food = make_food()
    r = client.post(f"{BASE}/foods/{food['id']}/reservations", json={"request_id": str(uuid.uuid4()), "quantity": 1})
    assert r.status_code == 401
    r = client.post(
        f"{BASE}/foods/{food['id']}/reservations",
        json={"request_id": str(uuid.uuid4()), "quantity": 1},
        headers={"X-Service-Key": "salah"},
    )
    assert r.status_code == 401


def test_reserve_reduces_stock_and_returns_snapshot(client, make_food, service_headers, recipient):
    food = make_food(quantity_total=10, max_per_request=5)
    rid, r = reserve(client, service_headers, food["id"], 2)
    assert r.status_code == 201
    data = r.get_json()["data"]
    assert data["donor_id"] == 10 and data["food_title"] == "Nasi Kotak Ayam" and data["status"] == "held"
    assert get_food(client, recipient, food["id"])["quantity_available"] == 8


def test_idempotent_same_request_id(client, make_food, service_headers, recipient):
    food = make_food(quantity_total=10)
    rid, r1 = reserve(client, service_headers, food["id"], 2)
    _, r2 = reserve(client, service_headers, food["id"], 2, rid=rid)
    assert r1.status_code == 201 and r2.status_code == 200
    assert get_food(client, recipient, food["id"])["quantity_available"] == 8
    _, r3 = reserve(client, service_headers, food["id"], 3, rid=rid)
    assert r3.status_code == 409 and r3.get_json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_never_negative_and_sold_out(client, make_food, service_headers, recipient):
    food = make_food(quantity_total=3, max_per_request=None)
    _, ok = reserve(client, service_headers, food["id"], 3)
    assert ok.status_code == 201
    f = get_food(client, recipient, food["id"])
    assert f["quantity_available"] == 0 and f["status"] == "out_of_stock"
    _, r = reserve(client, service_headers, food["id"], 1)
    assert r.status_code == 409
    assert get_food(client, recipient, food["id"])["quantity_available"] == 0


def test_insufficient_stock(client, make_food, service_headers, recipient):
    food = make_food(quantity_total=3, max_per_request=None)
    _, r = reserve(client, service_headers, food["id"], 5)
    assert r.status_code == 409 and r.get_json()["error"]["code"] == "INSUFFICIENT_STOCK"
    assert get_food(client, recipient, food["id"])["quantity_available"] == 3


def test_max_per_request(client, make_food, service_headers):
    food = make_food(quantity_total=10, max_per_request=2)
    _, r = reserve(client, service_headers, food["id"], 3)
    assert r.status_code == 422


def test_cannot_reserve_own_food(client, make_food, service_headers):
    food = make_food()
    _, r = reserve(client, service_headers, food["id"], 1, recipient_id=10)
    assert r.status_code == 422


def test_unknown_food(client, service_headers):
    _, r = reserve(client, service_headers, 99999999, 1)
    assert r.status_code == 404


def test_confirm_then_release_returns_stock_once(client, make_food, service_headers, recipient):
    food = make_food(quantity_total=10)
    rid, _ = reserve(client, service_headers, food["id"], 3)
    c = client.post(f"{BASE}/reservations/{rid}/confirm", headers=service_headers)
    assert c.status_code == 200 and c.get_json()["data"]["status"] == "confirmed"
    assert get_food(client, recipient, food["id"])["quantity_available"] == 7

    for _ in range(2):  # pelepasan ganda tidak boleh menambah stok dua kali
        rel = client.post(f"{BASE}/reservations/{rid}/release", headers=service_headers)
        assert rel.status_code == 200 and rel.get_json()["data"]["status"] == "released"
    assert get_food(client, recipient, food["id"])["quantity_available"] == 10
    assert client.post(f"{BASE}/reservations/{rid}/confirm", headers=service_headers).status_code == 409


def test_release_makes_sold_out_food_available(client, make_food, service_headers, recipient):
    food = make_food(quantity_total=2, max_per_request=None)
    rid, _ = reserve(client, service_headers, food["id"], 2)
    assert get_food(client, recipient, food["id"])["status"] == "out_of_stock"
    client.post(f"{BASE}/reservations/{rid}/release", headers=service_headers)
    f = get_food(client, recipient, food["id"])
    assert f["status"] == "available" and f["quantity_available"] == 2


def test_cannot_shrink_total_below_reserved(client, make_food, service_headers, donor):
    food = make_food(quantity_total=10, max_per_request=None)
    res_id, r = reserve(client, service_headers, food["id"], 4)
    assert r.status_code == 201
    r = client.patch(f"/api/v1/foods/{food['id']}", json={"quantity_total": 3}, headers=donor)
    assert r.status_code == 409
    r = client.patch(f"/api/v1/foods/{food['id']}", json={"quantity_total": 6}, headers=donor)
    assert r.status_code == 200 and r.get_json()["data"]["quantity_available"] == 2


def test_cannot_delete_with_pending_reservation(client, make_food, service_headers, donor):
    food = make_food()
    reserve(client, service_headers, food["id"], 1)
    assert client.delete(f"/api/v1/foods/{food['id']}", headers=donor).status_code == 409
