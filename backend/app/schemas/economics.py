"""Pydantic schemas for POST /economics."""

from __future__ import annotations

from pydantic import BaseModel, Field


class EconomicsBagsIn(BaseModel):
    urea_bags: float = Field(ge=0, default=0)
    dap_bags: float = Field(ge=0, default=0)
    mop_bags: float = Field(ge=0, default=0)


class EconomicsIn(BaseModel):
    current: EconomicsBagsIn = Field(description="Farmer's current fertilizer use (bags).")
    recommended: EconomicsBagsIn = Field(description="Recommended fertilizer plan (bags).")


class CostItemOut(BaseModel):
    product_key: str
    bags: float
    mrp_per_bag: float
    cost: float


class EconomicsOut(BaseModel):
    current_cost: float = Field(description="Total cost of current fertilizer use (₹).")
    recommended_cost: float = Field(description="Total cost of recommended plan (₹).")
    savings: float = Field(
        description=(
            "Net savings (₹). Positive means the recommended plan costs less. "
            "Negative means it costs more."
        ),
    )
    current_breakdown: list[CostItemOut]
    recommended_breakdown: list[CostItemOut]
    assumptions: list[str] = Field(
        description="Any price assumptions that are not statutory.",
    )
