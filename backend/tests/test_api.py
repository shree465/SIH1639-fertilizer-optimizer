"""Task 1.5 — endpoint verification for POST /recommend."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.nutrient_engine import REASON_R2A

client = TestClient(app)


def test_health_still_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_openapi_documents_recommend():
    r = client.get("/openapi.json")
    assert r.status_code == 200
    spec = r.json()
    assert "/recommend" in spec["paths"]
    assert "post" in spec["paths"]["/recommend"]


def test_recommend_blanket_rdf_one_acre():
    r = client.post(
        "/recommend",
        json={"plot": {"area": 1.0, "unit": "acre"}, "mode": "blanket_rdf"},
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["requirement_per_hectare"]["n"]["kg"] == 100.0
    assert body["requirement_per_plot"]["n"]["kg"] == 40.47

    plan = body["fertilizer_plan"]
    keys = {d["product_key"] for d in plan["doses"]}
    assert keys == {"dap", "urea", "mop"}

    # The DAP nitrogen deduction must be present and non-zero.
    assert plan["dap_nitrogen_credit_kg"] > 0

    urea = next(d for d in plan["doses"] if d["product_key"] == "urea")
    naive_urea = body["requirement_per_plot"]["n"]["kg"] / 0.46
    assert urea["kg"] < naive_urea

    assert body["provenance"]["source_url"].startswith("https://")
    assert body["has_blocking_notice"] is False


def test_recommend_stcr_blocks_p2o5_over_http():
    """The guard must survive serialisation: null kg, blocked status, reason code."""
    r = client.post(
        "/recommend",
        json={
            "plot": {"area": 1.0, "unit": "acre"},
            "mode": "stcr",
            "soil_test": {"n": 213.0, "p": 17.4, "k": 286.0},
            "target_yield_q_per_ha": 42.0,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()

    p = body["requirement_per_plot"]["p2o5"]
    assert p["kg"] is None
    assert p["status"] == "blocked"
    assert p["reason_code"] == REASON_R2A

    assert body["requirement_per_plot"]["n"]["kg"] is not None
    assert body["requirement_per_plot"]["k2o"]["kg"] is not None

    assert body["has_blocking_notice"] is True
    assert any(n["severity"] == "blocking" for n in body["notices"])

    # No DAP proposed and no phantom nitrogen credit.
    assert all(d["product_key"] != "dap" for d in body["fertilizer_plan"]["doses"])
    assert body["fertilizer_plan"]["dap_nitrogen_credit_kg"] == 0.0


def test_recommend_stcr_published_row_returns_p2o5():
    r = client.post(
        "/recommend",
        json={
            "plot": {"area": 1.0, "unit": "hectare"},
            "mode": "stcr",
            "soil_test": {"n": 200.0, "p": 20.0, "k": 300.0},
            "target_yield_q_per_ha": 40.0,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["requirement_per_hectare"]["p2o5"]["kg"] == 103.0
    assert body["requirement_per_hectare"]["n"]["kg"] == 140.0
    assert body["has_blocking_notice"] is False


def test_recommend_stcr_without_soil_test_is_rejected():
    r = client.post("/recommend", json={"plot": {"area": 1.0}, "mode": "stcr"})
    assert r.status_code == 422


def test_recommend_rejects_non_positive_area():
    r = client.post(
        "/recommend", json={"plot": {"area": 0, "unit": "acre"}, "mode": "blanket_rdf"}
    )
    assert r.status_code == 422
