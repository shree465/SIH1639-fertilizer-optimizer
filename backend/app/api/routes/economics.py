"""POST /economics — input-cost comparison between current and recommended fertilizer use."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.economics import (
    CostItemOut,
    EconomicsIn,
    EconomicsOut,
)
from app.services.economics import compute_economics

router = APIRouter(tags=["economics"])


@router.post(
    "/economics",
    response_model=EconomicsOut,
    summary="Fertilizer cost comparison: current vs recommended",
    description=(
        "Computes the input cost of the farmer's current fertilizer practice and the "
        "recommended plan using MRP data. Returns current cost, recommended cost, and net savings. "
        "No yield gain is fabricated — this is input-cost economics only."
    ),
)
def post_economics(payload: EconomicsIn) -> EconomicsOut:
    result = compute_economics(
        current_bags={
            "urea": payload.current.urea_bags,
            "dap": payload.current.dap_bags,
            "mop": payload.current.mop_bags,
        },
        recommended_bags={
            "urea": payload.recommended.urea_bags,
            "dap": payload.recommended.dap_bags,
            "mop": payload.recommended.mop_bags,
        },
    )

    return EconomicsOut(
        current_cost=result.current_cost,
        recommended_cost=result.recommended_cost,
        savings=result.savings,
        current_breakdown=[
            CostItemOut(
                product_key=item.product_key,
                bags=item.bags,
                mrp_per_bag=item.mrp_per_bag,
                cost=item.cost,
            )
            for item in result.current_breakdown
        ],
        recommended_breakdown=[
            CostItemOut(
                product_key=item.product_key,
                bags=item.bags,
                mrp_per_bag=item.mrp_per_bag,
                cost=item.cost,
            )
            for item in result.recommended_breakdown
        ],
        assumptions=list(result.assumptions),
    )


__all__ = ["router"]
