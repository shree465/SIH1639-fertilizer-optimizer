"""Task 1.2 — pure-Python nutrient engine (canonical module).

This is the manual-facing engine. Everything agronomic lives here or in the
pure helper modules it imports (`app.domain.products`, `app.domain.models`,
`app.domain.tables`). Those helpers are framework-free too.

Constraints, enforced by `tests/test_nutrient_engine.py`:

* no FastAPI imports
* no database imports
* pure calculation functions plus JSON data loading only

Two rules dominate this module:

1. **DAP nitrogen deduction.** DAP is 18-46-0. Sizing DAP to meet the phosphate
   requirement also delivers nitrogen, and that nitrogen must be subtracted
   before sizing urea. Applying full-rate urea *and* DAP is precisely the
   over-application this project exists to correct.

2. **GUARD-R2A-P2O5.** The basis of the STCR ``SP`` term (kg P/ha vs kg P2O5/ha)
   is unresolved. The engine must never compute a P2O5 dose from a real Soil
   Health Card phosphorus reading. It returns P2O5 as *blocked* with a reason
   code instead — never silently, never guessed, never substituted.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.domain import tables
from app.domain.models import (
    FertilizerPlan,
    LandUnit,
    Notice,
    NpkRatio,
    NutrientAmount,
    NutrientRequirement,
    NutrientStatus,
    Plot,
    ProductDose,
    Provenance,
    Recommendation,
    RecommendationMode,
    SoilTest,
    round_half_up,
)
from app.domain.products import DAP, MOP, UREA, FertilizerProduct

#: Reason code surfaced whenever P2O5 is withheld because of R2a.
REASON_R2A = "R2A_SP_BASIS_UNRESOLVED"


class EngineError(ValueError):
    """The request cannot be satisfied as stated."""


@dataclass(frozen=True)
class RecommendationRequest:
    plot: Plot
    mode: RecommendationMode = RecommendationMode.BLANKET_RDF
    soil_test: SoilTest | None = None
    target_yield_q_per_ha: float | None = None

    def __post_init__(self) -> None:
        if self.mode is RecommendationMode.STCR:
            if self.soil_test is None:
                raise EngineError("STCR mode requires a soil test")
            if self.target_yield_q_per_ha is None:
                raise EngineError("STCR mode requires a target yield in q/ha")
            if self.target_yield_q_per_ha <= 0:
                raise EngineError("target yield must be greater than zero")


# --------------------------------------------------------------------------
# Primitive calculations (the six manual acceptance behaviours)
# --------------------------------------------------------------------------


def dap_kg_for_phosphorus(p2o5_kg: float) -> float:
    """kg of DAP needed to supply `p2o5_kg` of P2O5. DAP is 46% P2O5."""
    if p2o5_kg <= 0:
        return 0.0
    return p2o5_kg / DAP.p2o5_fraction


def nitrogen_from_dap(dap_kg: float) -> float:
    """Nitrogen (kg) carried by `dap_kg` of DAP. DAP is 18% N."""
    return dap_kg * DAP.n_fraction


def urea_kg_for_nitrogen(n_kg: float) -> float:
    """kg of urea needed to supply `n_kg` of N. Urea is 46% N."""
    if n_kg <= 0:
        return 0.0
    return n_kg / UREA.n_fraction


def mop_kg_for_potash(k2o_kg: float) -> float:
    """kg of MOP needed to supply `k2o_kg` of K2O. MOP is 60% K2O."""
    if k2o_kg <= 0:
        return 0.0
    return k2o_kg / MOP.k2o_fraction


def bags_required(kg: float, bag_size_kg: float) -> int:
    """Whole retail bags, ALWAYS rounded up.

    A farmer cannot buy a fraction of a bag, and rounding down would silently
    under-apply. 0 kg needs 0 bags; anything above 0 needs at least 1.
    """
    if bag_size_kg <= 0:
        raise ValueError("bag size must be greater than zero")
    if kg <= 0:
        return 0
    return math.ceil(round(kg / bag_size_kg, 9))


def npk_ratio(n: float, p2o5: float, k2o: float) -> NpkRatio:
    """Normalize N:P2O5:K2O relative to K2O (potash).

    Potash is the denominator, which is what makes the familiar Indian 4:2:1
    NPK use-ratio target read the way it does:

        120:60:30 -> 4:2:1
        120:60:40 -> 3:1.5:1
        100:50:50 -> 2:1:1

    If K2O is zero there is no potash to divide by, so the ratio falls back to
    the smallest non-zero component rather than dividing by zero. If every
    component is zero the ratio is 0:0:0.
    """
    values = [float(n), float(p2o5), float(k2o)]
    if any(v < 0 for v in values):
        raise ValueError("nutrient amounts cannot be negative")

    non_zero = [v for v in values if v > 0]
    if not non_zero:
        return NpkRatio(0.0, 0.0, 0.0)

    potash = float(k2o)
    base = potash if potash > 0 else min(non_zero)
    return NpkRatio(*(round(v / base, 4) for v in values))


# --------------------------------------------------------------------------
# Per-hectare nutrient requirement
# --------------------------------------------------------------------------


def _blanket_rdf_per_hectare() -> tuple[NutrientRequirement, Provenance, list[Notice]]:
    entry = tables.get_entry(tables.BLANKET_RDF_ENTRY_ID)
    base = entry["base_kg_per_ha"]
    prov = tables.provenance_for(tables.BLANKET_RDF_ENTRY_ID)

    req = NutrientRequirement(
        n=NutrientAmount("n", float(base["n"])),
        p2o5=NutrientAmount("p2o5", float(base["p2o5"])),
        k2o=NutrientAmount("k2o", float(base["k2o"])),
    )
    notices = [
        Notice(
            code="BLANKET_RDF_NOT_SOIL_ADJUSTED",
            severity="info",
            message=(
                "This is the blanket recommended dose. It ignores soil test values. "
                "Supply a Soil Health Card reading to use the soil-test-based prescription."
            ),
            reference=tables.BLANKET_RDF_ENTRY_ID,
        ),
        Notice(
            code="RDF_SEASON_NOT_QUALIFIED",
            severity="info",
            message=(
                "The source states this dose as the general paddy RDF without qualifying "
                "season or establishment method (outstanding research item R3)."
            ),
            reference="R3",
        ),
    ]
    return req, Provenance(basis="published blanket RDF", **prov), notices


def _match_published_row(soil: SoilTest, target: float) -> dict | None:
    """Return the published reckoner cells if this exact row+target was published.

    GUARD-R2A-P2O5 explicitly permits "reproducing the published ready reckoner
    rows verbatim", because there the source itself supplies the paired
    soil-test value and prescribed dose — no interpretation of SP is needed.
    """
    reckoner = tables.stcr_ready_reckoner()
    if int(target) not in reckoner["targets_q_per_ha"]:
        return None
    key = f"target_{int(target)}"
    for row in reckoner["rows"]:
        st = row["soil_test"]
        if (
            float(st["n"]) == soil.n
            and float(st["p"]) == soil.p
            and float(st["k"]) == soil.k
        ):
            return row[key]
    return None


def _stcr_per_hectare(
    soil: SoilTest, target: float
) -> tuple[NutrientRequirement, Provenance, list[Notice]]:
    prov = tables.provenance_for(tables.STCR_ENTRY_ID)
    notices: list[Notice] = []
    minimums = tables.stcr_minimum_dose()

    published = _match_published_row(soil, target)
    if published is not None:
        # Permitted path: the source printed this exact combination.
        min_p2o5 = float(minimums["p2o5"])
        p_cell = published["p2o5"]
        p_kg = min_p2o5 if p_cell == "MIN_P2O5" else float(p_cell)
        notices.append(
            Notice(
                code="PUBLISHED_READY_RECKONER_ROW",
                severity="info",
                message=(
                    "Soil test values and yield target match a row printed in the source's "
                    "ready reckoner, so the published figures are used verbatim, including "
                    "P2O5. No interpretation of the SP term was required."
                ),
                reference=tables.STCR_ENTRY_ID,
            )
        )
        req = NutrientRequirement(
            n=NutrientAmount("n", float(published["n"])),
            p2o5=NutrientAmount("p2o5", p_kg),
            k2o=NutrientAmount("k2o", float(published["k2o"])),
        )
        return req, Provenance(basis="published ready reckoner row", **prov), notices

    # Computed path: equations for N and K2O; P2O5 is governed by the guard.
    coeffs = tables.stcr_equation_coefficients()

    def solve(nutrient: str, soil_value: float) -> float:
        c = coeffs[nutrient]
        raw = c["target"] * target - c["soil"] * soil_value
        floor = minimums[nutrient]
        if floor is not None and raw <= float(floor):
            raw = float(floor)
        return round_half_up(max(raw, 0.0))

    n_amount = NutrientAmount("n", solve("n", soil.n))
    k_amount = NutrientAmount("k2o", solve("k2o", soil.k))

    guard = tables.get_guard(tables.GUARD_R2A_P2O5)
    if tables.is_guard_active(tables.GUARD_R2A_P2O5):
        p_amount = NutrientAmount.blocked(
            "p2o5",
            reason_code=REASON_R2A,
            reason=guard.rule,
        )
        notices.append(
            Notice(
                code=REASON_R2A,
                severity="blocking",
                message=(
                    "P2O5 cannot be calculated from this soil test. "
                    + guard.reason
                    + " "
                    + guard.required_behaviour_until_resolved
                ),
                reference=guard.id,
            )
        )
    else:  # pragma: no cover - only reachable once R2a is resolved upstream
        p_amount = NutrientAmount("p2o5", solve("p2o5", soil.p))

    req = NutrientRequirement(n=n_amount, p2o5=p_amount, k2o=k_amount)
    return req, Provenance(basis="STCR targeted-yield equations", **prov), notices


# --------------------------------------------------------------------------
# Scaling and fertilizer allocation
# --------------------------------------------------------------------------


def _scale(req: NutrientRequirement, hectares: float) -> NutrientRequirement:
    def one(a: NutrientAmount) -> NutrientAmount:
        if not a.available:
            return a
        return NutrientAmount(a.nutrient, round_half_up(a.kg * hectares, 2))

    return NutrientRequirement(n=one(req.n), p2o5=one(req.p2o5), k2o=one(req.k2o))


def _dose(product: FertilizerProduct, kg: float, supplies: dict[str, float],
          note: str | None = None) -> ProductDose:
    kg = round_half_up(kg, 2)
    return ProductDose(
        product_key=product.key,
        product_name=product.name,
        grade=product.grade,
        kg=kg,
        bags=bags_required(kg, product.bag_size_kg),
        bag_size_kg=product.bag_size_kg,
        supplies=supplies,
        note=note,
    )


def build_fertilizer_plan(req: NutrientRequirement) -> tuple[FertilizerPlan, list[Notice]]:
    """Allocate DAP, then urea (net of DAP's nitrogen), then MOP.

    Order matters: the phosphate carrier is sized first because it also
    supplies nitrogen, and that nitrogen is then deducted from the urea.
    """
    notices: list[Notice] = []
    doses: list[ProductDose] = []
    dap_n_credit = 0.0
    excess_n = 0.0

    # 1. Phosphate via DAP (only if the P2O5 requirement is actually known).
    if req.p2o5.available and req.p2o5.kg > 0:
        dap_kg = dap_kg_for_phosphorus(req.p2o5.kg)
        # ---- DAP NITROGEN DEDUCTION ----
        dap_n_credit = nitrogen_from_dap(dap_kg)
        # --------------------------------
        doses.append(
            _dose(
                DAP,
                dap_kg,
                supplies={
                    "p2o5": round_half_up(req.p2o5.kg, 2),
                    "n": round_half_up(dap_n_credit, 2),
                },
                note="Also supplies nitrogen; deducted from the urea requirement below.",
            )
        )
    elif not req.p2o5.available:
        notices.append(
            Notice(
                code="NO_PHOSPHATE_PRODUCT",
                severity="warning",
                message=(
                    "No DAP quantity is given because the P2O5 requirement is unavailable. "
                    "Consequently no DAP nitrogen credit was applied, and the urea figure "
                    "below covers the full nitrogen requirement. If you apply DAP anyway, "
                    "reduce urea by 0.18 kg N per kg of DAP."
                ),
                reference=req.p2o5.reason_code,
            )
        )

    # 2. Nitrogen top-up via urea, net of the DAP nitrogen credit.
    if req.n.available:
        remaining_n = req.n.kg - dap_n_credit
        if remaining_n < 0:
            excess_n = round_half_up(-remaining_n, 2)
            remaining_n = 0.0
            notices.append(
                Notice(
                    code="DAP_NITROGEN_EXCEEDS_REQUIREMENT",
                    severity="warning",
                    message=(
                        f"DAP alone supplies {round_half_up(dap_n_credit, 2)} kg N, which "
                        f"exceeds the {req.n.kg} kg N requirement by {excess_n} kg. "
                        "No urea is needed."
                    ),
                )
            )
        doses.append(
            _dose(
                UREA,
                urea_kg_for_nitrogen(remaining_n),
                supplies={"n": round_half_up(remaining_n, 2)},
                note=(
                    f"Nitrogen requirement {round_half_up(req.n.kg, 2)} kg less "
                    f"{round_half_up(dap_n_credit, 2)} kg already supplied by DAP."
                    if dap_n_credit > 0
                    else None
                ),
            )
        )

    # 3. Potash via MOP.
    if req.k2o.available and req.k2o.kg > 0:
        doses.append(
            _dose(
                MOP,
                mop_kg_for_potash(req.k2o.kg),
                supplies={"k2o": round_half_up(req.k2o.kg, 2)},
            )
        )

    plan = FertilizerPlan(
        doses=tuple(doses),
        dap_nitrogen_credit_kg=round_half_up(dap_n_credit, 2),
        excess_nitrogen_kg=excess_n,
    )
    return plan, notices


# --------------------------------------------------------------------------
# Public entry point
# --------------------------------------------------------------------------


def recommend(request: RecommendationRequest) -> Recommendation:
    if request.mode is RecommendationMode.BLANKET_RDF:
        per_ha, provenance, notices = _blanket_rdf_per_hectare()
    elif request.mode is RecommendationMode.STCR:
        per_ha, provenance, notices = _stcr_per_hectare(
            request.soil_test, float(request.target_yield_q_per_ha)
        )
    else:  # pragma: no cover - enum is exhaustive
        raise EngineError(f"unsupported mode {request.mode!r}")

    per_plot = _scale(per_ha, request.plot.hectares)
    plan, plan_notices = build_fertilizer_plan(per_plot)

    ratio = None
    if per_ha.n.available and per_ha.k2o.available and per_ha.p2o5.available:
        ratio = npk_ratio(per_ha.n.kg, per_ha.p2o5.kg, per_ha.k2o.kg)

    return Recommendation(
        mode=request.mode,
        plot=request.plot,
        per_hectare=per_ha,
        per_plot=per_plot,
        plan=plan,
        provenance=provenance,
        notices=tuple(notices + plan_notices),
        npk_ratio=ratio,
    )


__all__ = [
    "DAP",
    "MOP",
    "REASON_R2A",
    "UREA",
    "EngineError",
    "LandUnit",
    "NpkRatio",
    "NutrientStatus",
    "Plot",
    "RecommendationMode",
    "RecommendationRequest",
    "SoilTest",
    "bags_required",
    "build_fertilizer_plan",
    "dap_kg_for_phosphorus",
    "mop_kg_for_potash",
    "nitrogen_from_dap",
    "npk_ratio",
    "recommend",
    "urea_kg_for_nitrogen",
]
