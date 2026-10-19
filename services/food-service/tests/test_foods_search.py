from tests.conftest import food_payload


def test_search_filter_pagination(client, donor, recipient):
    for i in range(5):
        client.post("/api/v1/foods", json=food_payload(title=f"Roti Unik{i}", category_id=3), headers=donor)
    client.post("/api/v1/foods", json=food_payload(title="Jus Jeruk Unik", category_id=5), headers=donor)

    r = client.get("/api/v1/foods?q=Unik&per_page=4", headers=recipient).get_json()
    assert r["meta"]["total"] == 6 and len(r["data"]) == 4 and r["meta"]["total_pages"] == 2

    r = client.get("/api/v1/foods?q=Unik&category_id=5", headers=recipient).get_json()
    assert r["meta"]["total"] == 1 and r["data"][0]["title"] == "Jus Jeruk Unik"

    r = client.get("/api/v1/foods?q=Unik&page=2&per_page=4", headers=recipient).get_json()
    assert len(r["data"]) == 2


def test_mine_only_for_donor(client, donor, donor2, recipient):
    client.post("/api/v1/foods", json=food_payload(title="Milik Donor Satu Xyz"), headers=donor)
    mine = client.get("/api/v1/foods?mine=true&q=Xyz", headers=donor).get_json()["data"]
    assert len(mine) == 1
    other = client.get("/api/v1/foods?mine=true&q=Xyz", headers=donor2).get_json()["data"]
    assert other == []
    assert client.get("/api/v1/foods?mine=true", headers=recipient).status_code == 403


def test_stats_admin_only(client, admin, donor):
    assert client.get("/api/v1/foods/stats", headers=donor).status_code == 403
    r = client.get("/api/v1/foods/stats", headers=admin)
    assert r.status_code == 200 and "by_status" in r.get_json()["data"]


def test_public_endpoints_need_no_login(client, make_food):
    make_food(title="Publik Satu Zzq")
    r = client.get("/api/v1/public/foods?q=Zzq")
    assert r.status_code == 200 and r.get_json()["meta"]["total"] == 1
    fid = r.get_json()["data"][0]["id"]
    assert client.get(f"/api/v1/public/foods/{fid}").status_code == 200
    assert client.get("/api/v1/public/categories").status_code == 200
    s = client.get("/api/v1/public/stats").get_json()["data"]
    assert s["available_foods"] >= 1 and s["available_portions"] >= 1 and isinstance(s["popular_categories"], list)


def test_location_filter_and_distance_sort(client, make_food, recipient):
    near = make_food(title="Dekat Qwx", latitude=-7.1550, longitude=112.6560)   # Gresik
    far = make_food(title="Jauh Qwx", latitude=-6.2000, longitude=106.8160)     # Jakarta
    make_food(title="Tanpa Koordinat Qwx")
    r = client.get("/api/v1/foods?q=Qwx&lat=-7.16&lng=112.65&radius_km=20", headers=recipient).get_json()
    assert [f["title"] for f in r["data"]] == ["Dekat Qwx"] and r["data"][0]["distance_km"] < 5
    r = client.get("/api/v1/foods?q=Qwx&lat=-7.16&lng=112.65&sort=distance", headers=recipient).get_json()
    assert [f["title"] for f in r["data"]] == ["Dekat Qwx", "Jauh Qwx"]
    assert r["data"][1]["distance_km"] > 600


def test_invalid_coordinates_rejected(client, donor):
    from tests.conftest import food_payload
    r = client.post("/api/v1/foods", json=food_payload(latitude=999, longitude=10), headers=donor)
    assert r.status_code == 422 and "latitude" in r.get_json()["error"]["details"]


def test_pickup_before_filter(client, make_food, recipient):
    make_food(title="Filter Waktu Vbn")
    assert client.get("/api/v1/foods?q=Vbn&pickup_before=2020-01-01T00:00:00Z", headers=recipient).get_json()["meta"]["total"] == 0
    assert client.get("/api/v1/foods?q=Vbn&pickup_before=2099-01-01T00:00:00Z", headers=recipient).get_json()["meta"]["total"] == 1


def test_category_admin_crud(client, admin, donor):
    assert client.post("/api/v1/categories", json={"name": "Katering"}, headers=donor).status_code == 403
    c = client.post("/api/v1/categories", json={"name": "Katering Uji"}, headers=admin)
    assert c.status_code == 201
    cid = c.get_json()["data"]["id"]
    assert client.post("/api/v1/categories", json={"name": "Katering Uji"}, headers=admin).status_code == 409
    assert client.patch(f"/api/v1/categories/{cid}", json={"name": "Katering Baru"}, headers=admin).status_code == 200
    assert client.delete(f"/api/v1/categories/{cid}", headers=admin).status_code == 204


def test_cannot_delete_category_in_use(client, make_food, admin):
    make_food(category_id=2)
    assert client.delete("/api/v1/categories/2", headers=admin).status_code == 409


def test_admin_actions_are_audited(client, make_food, admin, monkeypatch):
    sent = []
    import app.utils.audit as audit_mod
    monkeypatch.setattr(audit_mod.threading, "Thread",
                        lambda target, args, daemon: type("T", (), {"start": lambda self: sent.append(args[2])})())
    food = make_food(title="Dimoderasi Kxz")
    client.patch(f"/api/v1/foods/{food['id']}", json={"status": "closed"}, headers=admin)
    c = client.post("/api/v1/categories", json={"name": "Audit Uji"}, headers=admin).get_json()["data"]
    client.delete(f"/api/v1/categories/{c['id']}", headers=admin)
    actions = [p["action"] for p in sent]
    assert actions == ["food.update", "category.create", "category.delete"]
    assert sent[0]["actor_role"] == "admin" and sent[0]["target_id"] == str(food["id"])


def test_owner_actions_are_not_audited(client, make_food, donor, monkeypatch):
    sent = []
    import app.utils.audit as audit_mod
    monkeypatch.setattr(audit_mod.threading, "Thread",
                        lambda target, args, daemon: type("T", (), {"start": lambda self: sent.append(args[2])})())
    food = make_food()
    client.patch(f"/api/v1/foods/{food['id']}", json={"title": "Judul Baru Pemilik"}, headers=donor)
    assert sent == []
