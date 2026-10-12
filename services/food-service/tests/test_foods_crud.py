import io

from tests.conftest import food_payload


def test_recipient_cannot_create(client, recipient):
    r = client.post("/api/v1/foods", json=food_payload(), headers=recipient)
    assert r.status_code == 403


def test_create_and_get(client, donor, recipient):
    r = client.post("/api/v1/foods", json=food_payload(), headers=donor)
    assert r.status_code == 201
    food = r.get_json()["data"]
    assert food["quantity_available"] == 10 and food["donor_id"] == 10 and food["status"] == "available"
    g = client.get(f"/api/v1/foods/{food['id']}", headers=recipient)
    assert g.status_code == 200 and g.get_json()["data"]["title"] == "Nasi Kotak Ayam"


def test_validation_errors(client, donor):
    r = client.post("/api/v1/foods", json=food_payload(title="a", quantity_total=0), headers=donor)
    assert r.status_code == 422
    details = r.get_json()["error"]["details"]
    assert "title" in details and "quantity_total" in details


def test_expiry_in_past_rejected(client, donor):
    r = client.post("/api/v1/foods", json=food_payload(expires_at="2020-01-01T00:00:00Z",
                                                        pickup_start="2019-01-01T00:00:00Z",
                                                        pickup_end="2019-06-01T00:00:00Z"), headers=donor)
    assert r.status_code == 422


def test_max_per_request_not_above_total(client, donor):
    r = client.post("/api/v1/foods", json=food_payload(quantity_total=2, max_per_request=5), headers=donor)
    assert r.status_code == 422


def test_only_owner_can_update_delete(client, make_food, donor2, donor):
    food = make_food()
    assert client.patch(f"/api/v1/foods/{food['id']}", json={"title": "Diubah"}, headers=donor2).status_code == 403
    assert client.delete(f"/api/v1/foods/{food['id']}", headers=donor2).status_code == 403
    ok = client.patch(f"/api/v1/foods/{food['id']}", json={"title": "Judul Baru"}, headers=donor)
    assert ok.status_code == 200 and ok.get_json()["data"]["title"] == "Judul Baru"


def test_soft_delete(client, make_food, donor, recipient):
    food = make_food()
    assert client.delete(f"/api/v1/foods/{food['id']}", headers=donor).status_code == 204
    assert client.get(f"/api/v1/foods/{food['id']}", headers=recipient).status_code == 404


def test_close_and_reopen(client, make_food, donor, recipient):
    food = make_food()
    r = client.patch(f"/api/v1/foods/{food['id']}", json={"status": "closed"}, headers=donor)
    assert r.get_json()["data"]["status"] == "closed"
    listed = client.get("/api/v1/foods?per_page=50", headers=recipient).get_json()["data"]
    assert food["id"] not in [f["id"] for f in listed]
    r = client.patch(f"/api/v1/foods/{food['id']}", json={"status": "available"}, headers=donor)
    assert r.get_json()["data"]["status"] == "available"


def test_upload_image(client, make_food, donor):
    food = make_food()
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 20
    r = client.post(
        f"/api/v1/foods/{food['id']}/image",
        data={"image": (io.BytesIO(png), "foto.png", "image/png")},
        headers=donor,
        content_type="multipart/form-data",
    )
    assert r.status_code == 200
    url = r.get_json()["data"]["image_url"]
    assert url.startswith("/uploads/foods/")
    assert client.get(url).status_code == 200


def test_upload_rejects_non_image(client, make_food, donor):
    food = make_food()
    r = client.post(
        f"/api/v1/foods/{food['id']}/image",
        data={"image": (io.BytesIO(b"x"), "script.php", "text/plain")},
        headers=donor,
        content_type="multipart/form-data",
    )
    assert r.status_code == 422
