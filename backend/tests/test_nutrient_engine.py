"""Task 1.3 — nutrient engine acceptance tests.

The six core acceptance tests required by the manual:

1. test_dap_is_sized_from_phosphorus
2. test_dap_nitrogen_is_deducted
3. test_potash_conversion
4. test_zero_phosphorus_means_no_dap
5. test_bags_round_up
6. test_npk_ratio_normalization

Everything below those six is an additional guard/provenance test.

Canonical command:  cd backend && pytest tests/ -v
"""

from __future__ import annotations

import math

import pytest

from app.domain import tables
from app.domain.models import (
    LandUnit,
    NutrientAmount,
    NutrientRequirement,
    NutrientStatus,
    Plot,
    RecommendationMode,
    SoilTest,
    round_half_up,
)
from app.services.nutrient_engine import (
    DAP,
    MOP,
    REASON_R2A,
    UREA,
    RecommendationRequest,
    bags_required,
    build_fertilizer_plan,
    dap_kg_for_phosphorus,
    mop_kg_for_potash,
    nitrogen_from_dap,
    npk_ratio,
    recommend,
    urea_kg_for_nitrogen,
)


def _req(n: float, p2o5: float | None, k2o: float) -> NutrientRequirement:
    """Build a requirement; p2o5=None means 'blocked'."""
    p = (
        NutrientAmount.blocked("p2o5", REASON_R2A, "blocked for test")
        if p2o5 is None
        else NutrientAmount("p2o5", p2o5)
    )
    return NutrientRequirement(
        n=NutrientAmount("n", n), p2o5=p, k2o=NutrientAmount("k2o", k2o)
    )


# ============================ 1. DAP sized from phosphorus ==================


def test_dap_is_sized_from_phosphorus():
    """DAP quantity comes from the P2O5 requirement, at 46% P2O5."""
    assert DAP.p2o5_percent == 46.0
    assert dap_kg_for_phosphorus(46.0) == pytest.approx(100.0)
    assert dap_kg_for_phosphorus(60.0) == pytest.approx(60.0 / 0.46)
    assert dap_kg_for_phosphorus(60.0) == pytest.approx(130.43, abs=0.01)

    # And the engine uses it: DAP is driven by P2O5, never by N.
    plan, _ = build_fertilizer_plan(_req(120.0, 60.0, 40.0))
    assert plan.kg_of("dap") == pytest.approx(130.43, abs=0.02)

    # Doubling only the phosphorus doubles only the DAP.
    plan2, _ = build_fertilizer_plan(_req(120.0, 120.0, 40.0))
    assert plan2.kg_of("dap") == pytest.approx(2 * plan.kg_of("dap"), abs=0.05)

    # The DAP actually delivers the requested P2O5.
    assert DAP.nutrient_supplied("p2o5", plan.kg_of("dap")) == pytest.approx(60.0, abs=0.02)


# ============================ 2. DAP nitrogen deduction =====================


def test_dap_nitrogen_is_deducted():
    """Nitrogen carried by DAP must be subtracted before urea is sized.

    This is the headline correctness property of the engine. Deleting the
    deduction line in nutrient_engine.py must make THIS test fail.
    """
    req = _req(120.0, 60.0, 40.0)
    plan, _ = build_fertilizer_plan(req)

    dap_kg = 60.0 / 0.46
    credit = dap_kg * 0.18
    assert credit == pytest.approx(23.48, abs=0.02)
    assert plan.dap_nitrogen_credit_kg == pytest.approx(23.48, abs=0.02)

    # Urea covers only the REMAINDER.
    remaining = 120.0 - credit
    assert remaining == pytest.approx(96.52, abs=0.02)
    assert plan.kg_of("urea") == pytest.approx(remaining / 0.46, abs=0.05)
    assert plan.kg_of("urea") == pytest.approx(209.82, abs=0.1)

    # The deduction must actually bite: urea is strictly less than the naive figure.
    naive_urea = 120.0 / 0.46
    assert plan.kg_of("urea") < naive_urea - 40, (
        "DAP nitrogen was not deducted from the urea requirement"
    )

    # Total N delivered equals the requirement — no under- or over-supply.
    delivered = UREA.nutrient_supplied("n", plan.kg_of("urea")) + nitrogen_from_dap(
        plan.kg_of("dap")
    )
    assert delivered == pytest.approx(120.0, abs=0.05)


# ============================ 3. Potash conversion ==========================


def test_potash_conversion():
    """MOP quantity comes from the K2O requirement, at 60% K2O."""
    assert MOP.k2o_percent == 60.0
    assert mop_kg_for_potash(60.0) == pytest.approx(100.0)
    assert mop_kg_for_potash(40.0) == pytest.approx(40.0 / 0.60)
    assert mop_kg_for_potash(40.0) == pytest.approx(66.67, abs=0.01)

    plan, _ = build_fertilizer_plan(_req(120.0, 60.0, 40.0))
    assert plan.kg_of("mop") == pytest.approx(66.67, abs=0.02)
    assert MOP.nutrient_supplied("k2o", plan.kg_of("mop")) == pytest.approx(40.0, abs=0.02)

    # MOP carries no N, so it never affects the urea figure.
    assert MOP.n_fraction == 0.0


# ============================ 4. Zero phosphorus, no DAP ====================


def test_zero_phosphorus_means_no_dap():
    """With no P2O5 requirement there is no DAP — and so no nitrogen credit."""
    plan, _ = build_fertilizer_plan(_req(120.0, 0.0, 40.0))

    assert plan.dose_for("dap") is None
    assert plan.kg_of("dap") == 0.0
    assert plan.dap_nitrogen_credit_kg == 0.0

    # Urea must therefore cover the FULL nitrogen requirement.
    assert plan.kg_of("urea") == pytest.approx(120.0 / 0.46, abs=0.02)
    assert UREA.nutrient_supplied("n", plan.kg_of("urea")) == pytest.approx(120.0, abs=0.05)

    # Potash is unaffected.
    assert plan.kg_of("mop") == pytest.approx(66.67, abs=0.02)

    assert dap_kg_for_phosphorus(0.0) == 0.0


# ============================ 5. Bags round up ==============================


def test_bags_round_up():
    """Bags are whole numbers, always rounded up. Never round a farmer short."""
    assert bags_required(0.0, 50) == 0
    assert bags_required(0.1, 50) == 1
    assert bags_required(50.0, 50) == 1
    assert bags_required(50.1, 50) == 2
    assert bags_required(99.9, 50) == 2
    assert bags_required(100.0, 50) == 2
    assert bags_required(101.0, 50) == 3

    # Urea uses a 45 kg bag; DAP and MOP use 50 kg.
    assert UREA.bag_size_kg == 45.0
    assert DAP.bag_size_kg == 50.0
    assert MOP.bag_size_kg == 50.0

    plan, _ = build_fertilizer_plan(_req(120.0, 60.0, 40.0))
    for dose in plan.doses:
        assert isinstance(dose.bags, int)
        assert dose.bags == math.ceil(round(dose.kg / dose.bag_size_kg, 9))
        # Bags must always cover the requirement, never fall short of it.
        assert dose.bags * dose.bag_size_kg >= dose.kg

    # 209.82 kg urea / 45 kg = 4.66 -> 5 bags; 130.43 / 50 = 2.6 -> 3 bags.
    assert plan.dose_for("urea").bags == 5
    assert plan.dose_for("dap").bags == 3
    assert plan.dose_for("mop").bags == 2  # 66.67 / 50 = 1.33 -> 2

    with pytest.raises(ValueError):
        bags_required(10, 0)


# ============================ 6. NPK ratio normalization ====================


def test_npk_ratio_normalization():
    """N:P2O5:K2O normalized relative to K2O (potash)."""
    # Manual acceptance case: potash is the denominator.
    assert npk_ratio(120, 60, 30).as_tuple() == (4.0, 2.0, 1.0)
    assert str(npk_ratio(120, 60, 30)) == "4:2:1"

    assert npk_ratio(120, 60, 40).as_tuple() == (3.0, 1.5, 1.0)
    assert str(npk_ratio(120, 60, 40)) == "3:1.5:1"

    assert npk_ratio(100, 50, 50).as_tuple() == (2.0, 1.0, 1.0)
    assert str(npk_ratio(100, 50, 50)) == "2:1:1"

    # K2O is always exactly 1 whenever potash is present — that is what
    # "normalized relative to K2O" means.
    for n, p, k in [(120, 60, 30), (120, 60, 40), (100, 50, 50), (40, 90, 25)]:
        assert npk_ratio(n, p, k).k2o == 1.0

    # Scale invariance: the ratio does not depend on plot size.
    assert npk_ratio(120, 60, 30).as_tuple() == npk_ratio(12, 6, 3).as_tuple()

    # Zero components are preserved, not treated as the base.
    assert str(npk_ratio(120, 0, 40)) == "3:0:1"
    assert npk_ratio(0, 0, 0).as_tuple() == (0.0, 0.0, 0.0)

    with pytest.raises(ValueError):
        npk_ratio(-1, 10, 10)

    # The engine attaches the ratio to a recommendation.
    rec = recommend(
        RecommendationRequest(
            plot=Plot(1.0, LandUnit.ACRE), mode=RecommendationMode.BLANKET_RDF
        )
    )
    assert str(rec.npk_ratio) == "2:1:1"  # 100:50:50


def test_npk_ratio_is_normalized_by_potash_not_smallest_component():
    """Regression: the denominator must be K2O, never simply the smallest value.

    These cases are the ones that distinguish the two rules. If normalization
    reverted to "divide by the smallest non-zero component", every assertion
    below would fail, because K2O is not the smallest component in any of them.
    """
    # K2O is the LARGEST component -> normalizing by it gives values < 1.
    assert npk_ratio(40, 20, 80).as_tuple() == (0.5, 0.25, 1.0)
    # Normalizing by the smallest (20) would have given (2, 1, 4).

    # K2O in the middle: smallest is P2O5, so the two rules diverge.
    assert npk_ratio(120, 30, 60).as_tuple() == (2.0, 0.5, 1.0)
    # Normalizing by the smallest (30) would have given (4, 1, 2).

    # In every case K2O normalizes to exactly 1.
    for n, p, k in [(40, 20, 80), (120, 30, 60), (10, 10, 100)]:
        ratio = npk_ratio(n, p, k)
        assert ratio.k2o == 1.0
        assert ratio.n == pytest.approx(n / k)
        assert ratio.p2o5 == pytest.approx(p / k)


def test_npk_ratio_handles_zero_potash_without_dividing_by_zero():
    """K2O == 0 must not raise; it falls back to the smallest non-zero value."""
    ratio = npk_ratio(120, 60, 0)
    assert ratio.as_tuple() == (2.0, 1.0, 0.0)  # base = 60, the smallest non-zero
    assert str(ratio) == "2:1:0"

    assert npk_ratio(120, 0, 0).as_tuple() == (1.0, 0.0, 0.0)
    assert npk_ratio(0, 60, 0).as_tuple() == (0.0, 1.0, 0.0)
    assert npk_ratio(0, 0, 0).as_tuple() == (0.0, 0.0, 0.0)

    # And the engine path is safe too: zero potash must not blow up.
    plan, _ = build_fertilizer_plan(_req(120.0, 60.0, 0.0))
    assert plan.dose_for("mop") is None


# ==================== additional guard / provenance tests ===================


def test_dap_nitrogen_exceeding_requirement_zeroes_urea():
    plan, notices = build_fertilizer_plan(_req(10.0, 100.0, 0.0))
    assert plan.kg_of("urea") == 0.0
    assert plan.excess_nitrogen_kg > 0
    assert any(n.code == "DAP_NITROGEN_EXCEEDS_REQUIREMENT" for n in notices)


def test_blanket_rdf_and_per_acre_conversion():
    rec = recommend(
        RecommendationRequest(
            plot=Plot(1.0, LandUnit.ACRE), mode=RecommendationMode.BLANKET_RDF
        )
    )
    assert (rec.per_hectare.n.kg, rec.per_hectare.p2o5.kg, rec.per_hectare.k2o.kg) == (
        100.0,
        50.0,
        50.0,
    )
    factor = tables.hectare_to_acre()
    assert rec.per_plot.n.kg == pytest.approx(100.0 / factor, abs=0.01)
    assert rec.per_plot.n.kg == pytest.approx(40.47, abs=0.01)
    assert rec.provenance.entry_id == tables.BLANKET_RDF_ENTRY_ID
    assert rec.provenance.source_url.startswith("https://")


def test_engine_reproduces_mpkv_published_quantities():
    """MPKV Rahuri 2013-14 rec. 17: 75:37.5:37.5 = 130.5 kg Urea, 82.5 kg DAP, 62.25 kg MOP.

    Reproducing those confirms the FCO grades AND that MPKV themselves applied
    the DAP nitrogen deduction (130.5*0.46 + 82.5*0.18 = 74.88 ~ 75 kg N).
    """
    published_urea, published_dap, published_mop = 130.5, 82.5, 62.25

    n_delivered = UREA.nutrient_supplied("n", published_urea) + nitrogen_from_dap(
        published_dap
    )
    assert n_delivered == pytest.approx(75.0, abs=0.15)
    assert 75.0 / 0.46 > published_urea * 1.2  # naive urea would be much larger

    plan, _ = build_fertilizer_plan(_req(75.0, 37.5, 37.5))
    assert plan.kg_of("urea") == pytest.approx(published_urea, rel=0.02)
    assert plan.kg_of("dap") == pytest.approx(published_dap, rel=0.02)
    assert plan.kg_of("mop") == pytest.approx(published_mop, rel=0.02)


def test_stcr_equations_reproduce_published_ready_reckoner():
    reckoner = tables.stcr_ready_reckoner()
    coeffs = tables.stcr_equation_coefficients()
    checked = 0
    for row in reckoner["rows"]:
        st = row["soil_test"]
        for target in reckoner["targets_q_per_ha"]:
            cells = row[f"target_{target}"]
            fn = coeffs["n"]["target"] * target - coeffs["n"]["soil"] * st["n"]
            fk = coeffs["k2o"]["target"] * target - coeffs["k2o"]["soil"] * st["k"]
            assert round_half_up(fn) == cells["n"]
            assert round_half_up(fk) == cells["k2o"]
            checked += 2
    assert checked == 20

    rec = recommend(
        RecommendationRequest(
            plot=Plot(1.0, LandUnit.HECTARE),
            mode=RecommendationMode.STCR,
            soil_test=SoilTest(n=200, p=20, k=300),
            target_yield_q_per_ha=40,
        )
    )
    assert (rec.per_hectare.n.kg, rec.per_hectare.k2o.kg) == (140.0, 61.0)
    assert rec.per_hectare.p2o5.kg == 103.0
    assert any(n.code == "PUBLISHED_READY_RECKONER_ROW" for n in rec.notices)

    rec_min = recommend(
        RecommendationRequest(
            plot=Plot(1.0, LandUnit.HECTARE),
            mode=RecommendationMode.STCR,
            soil_test=SoilTest(n=300, p=30, k=400),
            target_yield_q_per_ha=40,
        )
    )
    assert rec_min.per_hectare.p2o5.kg == 25.0


def test_guard_r2a_blocks_p2o5_for_real_soil_test():
    assert tables.is_guard_active(tables.GUARD_R2A_P2O5)

    rec = recommend(
        RecommendationRequest(
            plot=Plot(1.0, LandUnit.ACRE),
            mode=RecommendationMode.STCR,
            soil_test=SoilTest(n=213.0, p=17.4, k=286.0),
            target_yield_q_per_ha=42,
        )
    )
    assert rec.per_hectare.n.available and rec.per_hectare.k2o.available
    assert rec.per_hectare.p2o5.kg is None
    assert rec.per_plot.p2o5.kg is None
    assert rec.per_hectare.p2o5.status is NutrientStatus.BLOCKED
    assert rec.per_hectare.p2o5.reason_code == REASON_R2A

    blocking = [n for n in rec.notices if n.severity == "blocking"]
    assert len(blocking) == 1
    assert blocking[0].reference == tables.GUARD_R2A_P2O5

    # No DAP, no phantom nitrogen credit, and urea covers the full N.
    assert rec.plan.dose_for("dap") is None
    assert rec.plan.dap_nitrogen_credit_kg == 0.0
    assert any(n.code == "NO_PHOSPHATE_PRODUCT" for n in rec.notices)
    assert UREA.nutrient_supplied("n", rec.plan.kg_of("urea")) == pytest.approx(
        rec.per_plot.n.kg, abs=0.05
    )
    # No NPK ratio is claimed when a component is unavailable.
    assert rec.npk_ratio is None


def test_engine_is_free_of_web_and_db_imports():
    """The canonical engine and its pure helpers must not import FastAPI/DB.

    Checked by parsing imports, not grepping text: the docstrings mention
    FastAPI by name, so a text search would false-positive.
    """
    import ast

    forbidden = {"fastapi", "pydantic", "pydantic_settings", "sqlalchemy", "psycopg"}
    backend = tables.DATA_FILE.parents[1]
    paths = [backend / "app" / "services" / "nutrient_engine.py"]
    paths += sorted((backend / "app" / "domain").glob("*.py"))

    for path in paths:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                names = [node.module or ""]
            else:
                continue
            for name in names:
                assert name.split(".")[0] not in forbidden, f"{path.name} imports {name}"

    assert (backend / "app" / "services" / "nutrient_engine.py").exists()


def test_urea_kg_for_nitrogen_helper():
    assert urea_kg_for_nitrogen(46.0) == pytest.approx(100.0)
    assert urea_kg_for_nitrogen(0.0) == 0.0
