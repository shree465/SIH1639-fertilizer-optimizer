"""Pydantic schemas for POST /schemes/match."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FarmerProfileIn(BaseModel):
    """Farmer profile for scheme eligibility matching."""

    is_landholding: bool = Field(
        default=True,
        description="Whether the farmer owns cultivable land.",
    )
    state: str = Field(description="Indian state, e.g. 'Maharashtra'.")
    crop: str = Field(
        default="Rice / Paddy (kharif)",
        description="Crop being grown.",
    )


class SchemeOut(BaseModel):
    id: str
    name: str
    description: str
    eligibility_met: bool
    reason: str = Field(description="Why the farmer is or is not eligible.")
    how_to_apply: str
    source: str
    source_url: str


class SchemesMatchOut(BaseModel):
    schemes: list[SchemeOut]
    disclaimer: str = Field(
        default=(
            "Eligibility is indicative only. Actual eligibility involves additional "
            "documentation and verification by the issuing agency. Always check the "
            "official portal."
        ),
    )
