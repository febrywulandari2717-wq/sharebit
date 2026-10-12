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
