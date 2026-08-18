"""Pydantic schemas for POST /imbalance."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FertilizerBagsIn(BaseModel):
    """Bag counts for each product."""

    urea_bags: float = Field(ge=0, default=0, description="Number of urea bags (45 kg each).")
    dap_bags: float = Field(ge=0, default=0, description="Number of DAP bags (50 kg each).")
    mop_bags: float = Field(ge=0, default=0, description="Number of MOP bags (50 kg each).")


class ImbalanceIn(BaseModel):
    current: FertilizerBagsIn = Field(description="Farmer's current fertilizer practice.")
    recommended: FertilizerBagsIn = Field(description="Recommended fertilizer plan.")


class NpkRatioOut(BaseModel):
    n: float
    p2o5: float
    k2o: float
    label: str = Field(description="Human-readable ratio string, e.g. '4:2:1'.")


class NutrientTotalsOut(BaseModel):
    n_kg: float
    p2o5_kg: float
    k2o_kg: float


class ImbalanceOut(BaseModel):
    current_totals: NutrientTotalsOut
    recommended_totals: NutrientTotalsOut

    current_ratio: NpkRatioOut | None = Field(
        default=None,
        description="Null when potash is zero — ratio cannot be computed.",
    )
    recommended_ratio: NpkRatioOut | None = Field(
        default=None,
        description="Null when potash is zero — ratio cannot be computed.",
    )
    target_ratio: NpkRatioOut = Field(
        description="The ideal 4:2:1 NPK use-ratio target for India.",
    )

    nitrogen_surplus_kg: float = Field(
        description=(
            "Nitrogen difference: current N minus recommended N. "
            "Positive means the farmer is over-applying nitrogen."
        ),
    )

    current_ratio_message: str | None = Field(
        default=None,
        description="Explanatory message when the current ratio cannot be computed.",
    )
    recommended_ratio_message: str | None = Field(
        default=None,
        description="Explanatory message when the recommended ratio cannot be computed.",
    )
