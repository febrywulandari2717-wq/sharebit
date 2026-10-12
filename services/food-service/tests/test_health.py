def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.get_json()["data"]
    assert body["service"] == "food"
    assert body["database"] == "up"
