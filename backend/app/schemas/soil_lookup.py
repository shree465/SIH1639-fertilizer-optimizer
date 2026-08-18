"""Pydantic schemas for GET /soil-lookup/{card_id}."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SoilResults(BaseModel):
    ph: float
    ec_ds_per_m: float
    organic_carbon_percent: float
    available_n_kg_per_ha: float
    available_p_kg_per_ha: float
    available_k_kg_per_ha: float
    sulphur_kg_per_ha: float | None = None
    zinc_ppm: float | None = None
    boron_ppm: float | None = None
    iron_ppm: float | None = None
    manganese_ppm: float | None = None
    copper_ppm: float | None = None


class NutrientGrades(BaseModel):
    n: str | None = None
    p: str | None = None
    k: str | None = None
    organic_carbon: str | None = None
    sulphur: str | None = None
    zinc: str | None = None
    boron: str | None = None
    iron: str | None = None
    manganese: str | None = None
    copper: str | None = None


class SoilLookupOut(BaseModel):
    card_id: str
    issued_date: str
    village: str
    district: str
    state: str
    soil_type: str | None = None
    irrigation: str | None = None
    results: SoilResults
    nutrient_grades: NutrientGrades | None = None
    recommendations_text: str | None = None
    is_simulated: bool = Field(
        default=True,
        description="Always true — this data is simulated for the demo.",
    )
    disclaimer: str = Field(
        default=(
            "This is SIMULATED demo data. It does not represent a real "
            "Soil Health Card from the Government of India portal."
        ),
    )
