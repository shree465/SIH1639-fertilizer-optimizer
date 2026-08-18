"""POST /imbalance — NPK ratio comparison between current practice and recommendation.

Calculates nutrient totals from fertilizer bag counts using the product
specifications from `app.domain.products`, then computes K2O-normalized ratios.

The zero-potash case is handled explicitly: if K2O is zero the ratio cannot be
computed in the conventional K2O-normalized form, and the response says so
rather than crashing or inventing a number.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.domain.products import DAP, MOP, UREA
from app.schemas.imbalance import (
    FertilizerBagsIn,
    ImbalanceIn,
    ImbalanceOut,
    NpkRatioOut,
    NutrientTotalsOut,
)
from app.services.nutrient_engine import npk_ratio

router = APIRouter(tags=["imbalance"])

NO_POTASH_MESSAGE = (
    "No potash applied — ratio cannot be computed. "
    "This is itself the problem: the 4:2:1 target requires potash."
)


def _nutrient_totals(bags: FertilizerBagsIn) -> tuple[float, float, float]:
    """Calculate total N, P2O5, K2O (kg) from bag counts."""
    urea_kg = bags.urea_bags * UREA.bag_size_kg
    dap_kg = bags.dap_bags * DAP.bag_size_kg
    mop_kg = bags.mop_bags * MOP.bag_size_kg

    n_kg = urea_kg * UREA.n_fraction + dap_kg * DAP.n_fraction
    p2o5_kg = dap_kg * DAP.p2o5_fraction
    k2o_kg = mop_kg * MOP.k2o_fraction

    return (round(n_kg, 2), round(p2o5_kg, 2), round(k2o_kg, 2))


def _ratio_or_none(
    n: float, p2o5: float, k2o: float,
) -> tuple[NpkRatioOut | None, str | None]:
    """Compute ratio; return None + message if all zeros or K2O is zero."""
    if n == 0 and p2o5 == 0 and k2o == 0:
        return None, "No fertilizer applied — nothing to compute a ratio from."
    if k2o == 0:
        return None, NO_POTASH_MESSAGE

    r = npk_ratio(n, p2o5, k2o)
    # Round for display
    rn = round(r.n, 1)
    rp = round(r.p2o5, 1)
    rk = round(r.k2o, 1)

    def fmt(v: float) -> str:
        return str(int(v)) if float(v).is_integer() else f"{v:g}"

    return (
        NpkRatioOut(n=rn, p2o5=rp, k2o=rk, label=f"{fmt(rn)}:{fmt(rp)}:{fmt(rk)}"),
        None,
    )


TARGET_RATIO = NpkRatioOut(n=4.0, p2o5=2.0, k2o=1.0, label="4:2:1")


@router.post(
    "/imbalance",
    response_model=ImbalanceOut,
    summary="NPK ratio comparison: current vs recommended vs target",
    description=(
        "Computes nutrient totals from bag counts, then returns K2O-normalized NPK ratios "
        "for the farmer's current practice and the recommended plan, alongside the 4:2:1 target. "
        "When potash is zero the ratio is null with an explanatory message."
    ),
)
def post_imbalance(payload: ImbalanceIn) -> ImbalanceOut:
    cn, cp, ck = _nutrient_totals(payload.current)
    rn, rp, rk = _nutrient_totals(payload.recommended)

    current_ratio, current_msg = _ratio_or_none(cn, cp, ck)
    recommended_ratio, recommended_msg = _ratio_or_none(rn, rp, rk)

    nitrogen_surplus = round(cn - rn, 2)

    return ImbalanceOut(
        current_totals=NutrientTotalsOut(n_kg=cn, p2o5_kg=cp, k2o_kg=ck),
        recommended_totals=NutrientTotalsOut(n_kg=rn, p2o5_kg=rp, k2o_kg=rk),
        current_ratio=current_ratio,
        recommended_ratio=recommended_ratio,
        target_ratio=TARGET_RATIO,
        nitrogen_surplus_kg=nitrogen_surplus,
        current_ratio_message=current_msg,
        recommended_ratio_message=recommended_msg,
    )


__all__ = ["router"]
