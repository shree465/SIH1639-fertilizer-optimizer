"""Phase 3 — endpoint verification for all new routes."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# --------------------------------------------------------------------------
# 3.1 Imbalance
# --------------------------------------------------------------------------


def test_imbalance_normal():
    """Current practice 3 urea / 1 DAP / 0 MOP vs recommended 2/1/1."""
    r = client.post(
        "/imbalance",
        json={
            "current": {"urea_bags": 3, "dap_bags": 1, "mop_bags": 0},
            "recommended": {"urea_bags": 2, "dap_bags": 1, "mop_bags": 1},
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    # Current has zero potash → ratio should be null
    assert body["current_ratio"] is None
    assert body["current_ratio_message"] is not None
    assert "potash" in body["current_ratio_message"].lower()

    # Recommended has potash → ratio should be present
    assert body["recommended_ratio"] is not None
    assert body["recommended_ratio"]["label"]

    # Target ratio is always 4:2:1
    assert body["target_ratio"]["label"] == "4:2:1"

    # Nitrogen surplus should be positive (farmer is over-applying)
    assert body["nitrogen_surplus_kg"] > 0


def test_imbalance_zero_potash_both():
    """When both have zero potash, both ratios should be null."""
    r = client.post(
        "/imbalance",
        json={
            "current": {"urea_bags": 2, "dap_bags": 1, "mop_bags": 0},
            "recommended": {"urea_bags": 1, "dap_bags": 1, "mop_bags": 0},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["current_ratio"] is None
    assert body["recommended_ratio"] is None


def test_imbalance_all_zeros():
    r = client.post(
        "/imbalance",
        json={
            "current": {"urea_bags": 0, "dap_bags": 0, "mop_bags": 0},
            "recommended": {"urea_bags": 0, "dap_bags": 0, "mop_bags": 0},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["nitrogen_surplus_kg"] == 0
    assert body["current_ratio"] is None
    assert body["recommended_ratio"] is None


def test_imbalance_nutrient_math():
    """Verify nutrient totals: 1 urea bag = 45 * 0.46 = 20.7 kg N."""
    r = client.post(
        "/imbalance",
        json={
            "current": {"urea_bags": 1, "dap_bags": 0, "mop_bags": 0},
            "recommended": {"urea_bags": 0, "dap_bags": 0, "mop_bags": 0},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["current_totals"]["n_kg"] == 20.7
    assert body["current_totals"]["p2o5_kg"] == 0
    assert body["current_totals"]["k2o_kg"] == 0


# --------------------------------------------------------------------------
# 3.2 Economics
# --------------------------------------------------------------------------


def test_economics_normal():
    r = client.post(
        "/economics",
        json={
            "current": {"urea_bags": 3, "dap_bags": 1, "mop_bags": 0},
            "recommended": {"urea_bags": 2, "dap_bags": 1, "mop_bags": 1},
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert "current_cost" in body
    assert "recommended_cost" in body
    assert "savings" in body

    # 3 urea = 3 * 242 = 726; 1 DAP = 1350 → current = 2076
    assert body["current_cost"] == 726 + 1350

    # 2 urea = 484; 1 DAP = 1350; 1 MOP = 1700 → recommended = 3534
    assert body["recommended_cost"] == 484 + 1350 + 1700

    # savings = current - recommended (negative here means plan costs more)
    assert body["savings"] == body["current_cost"] - body["recommended_cost"]


def test_economics_zero_bags():
    r = client.post(
        "/economics",
        json={
            "current": {"urea_bags": 0, "dap_bags": 0, "mop_bags": 0},
            "recommended": {"urea_bags": 0, "dap_bags": 0, "mop_bags": 0},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["current_cost"] == 0
    assert body["recommended_cost"] == 0
    assert body["savings"] == 0


# --------------------------------------------------------------------------
# 3.3 Digital LCC
# --------------------------------------------------------------------------


def test_lcc_top_dress():
    """Band 2 (below threshold 4) should return top_dress."""
    r = client.post("/lcc/reading", json={"band": 2, "method": "manual"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["decision"] == "top_dress"
    assert body["band"] == 2


def test_lcc_hold():
    """Band 4 (at threshold) should return hold."""
    r = client.post("/lcc/reading", json={"band": 4, "method": "manual"})
    assert r.status_code == 200
    assert r.json()["decision"] == "hold"


def test_lcc_excess():
    """Band 6 should return hold with excess warning."""
    r = client.post("/lcc/reading", json={"band": 6, "method": "camera_visual"})
    assert r.status_code == 200
    body = r.json()
    assert body["decision"] == "hold"
    assert "excess" in body["explanation"].lower() or "over" in body["explanation"].lower()


def test_lcc_invalid_band():
    r = client.post("/lcc/reading", json={"band": 0})
    assert r.status_code == 422

    r = client.post("/lcc/reading", json={"band": 7})
    assert r.status_code == 422


# --------------------------------------------------------------------------
# 3.4 Scheme Matcher
# --------------------------------------------------------------------------


def test_schemes_match_demo_persona():
    """The locked demo persona (Maharashtra, kharif rice, landholding) should match at least 1."""
    r = client.post(
        "/schemes/match",
        json={
            "is_landholding": True,
            "state": "Maharashtra",
            "crop": "Rice / Paddy (kharif)",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    matched = [s for s in body["schemes"] if s["eligibility_met"]]
    assert len(matched) >= 1
    # Each matched scheme must have a source_url
    for s in matched:
        assert s["source_url"].startswith("https://")


def test_schemes_have_disclaimer():
    r = client.post(
        "/schemes/match",
        json={"state": "Maharashtra", "crop": "Rice / Paddy (kharif)"},
    )
    assert r.status_code == 200
    assert "disclaimer" in r.json()


# --------------------------------------------------------------------------
# 3.6 SHC Simulation
# --------------------------------------------------------------------------


def test_soil_lookup_valid_card():
    r = client.get("/soil-lookup/MH-PN-2024-001234")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["card_id"] == "MH-PN-2024-001234"
    assert body["issued_date"] == "2024-03-15"
    assert body["is_simulated"] is True
    assert "SIMULATED" in body["disclaimer"].upper()
    assert body["results"]["available_n_kg_per_ha"] == 213.0
    assert body["results"]["available_p_kg_per_ha"] == 17.4
    assert body["results"]["available_k_kg_per_ha"] == 286.0


def test_soil_lookup_second_card():
    r = client.get("/soil-lookup/MH-PN-2024-005678")
    assert r.status_code == 200
    body = r.json()
    assert body["card_id"] == "MH-PN-2024-005678"
    assert body["district"] == "Ahmednagar"


def test_soil_lookup_unknown_card():
    r = client.get("/soil-lookup/NONEXISTENT-ID")
    assert r.status_code == 404


def test_soil_lookup_has_nutrient_grades():
    r = client.get("/soil-lookup/MH-PN-2024-001234")
    body = r.json()
    grades = body["nutrient_grades"]
    assert grades["n"] == "low"
    assert grades["k"] == "high"


# --------------------------------------------------------------------------
# Guard: existing Phase 2 tests still pass
# --------------------------------------------------------------------------


def test_health_still_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_recommend_still_works():
    r = client.post(
        "/recommend",
        json={"plot": {"area": 1.0, "unit": "acre"}, "mode": "blanket_rdf"},
    )
    assert r.status_code == 200


def test_r2a_guard_preserved():
    """GUARD-R2A-P2O5 must still block P2O5 for arbitrary soil test values."""
    r = client.post(
        "/recommend",
        json={
            "plot": {"area": 1.0, "unit": "acre"},
            "mode": "stcr",
            "soil_test": {"n": 213.0, "p": 17.4, "k": 286.0},
            "target_yield_q_per_ha": 42.0,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["requirement_per_plot"]["p2o5"]["status"] == "blocked"
    assert body["has_blocking_notice"] is True
