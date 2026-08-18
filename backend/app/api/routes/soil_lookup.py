"""GET /soil-lookup/{card_id} — simulated Soil Health Card lookup.

Returns a mock SHC record from backend/data/shc_mock.json. This is demo data
only — no government API is contacted.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from app.schemas.soil_lookup import (
    NutrientGrades,
    SoilLookupOut,
    SoilResults,
)

router = APIRouter(tags=["soil-lookup"])

DATA_FILE = Path(__file__).resolve().parents[3] / "data" / "shc_mock.json"


@lru_cache(maxsize=1)
def _load_cards() -> dict[str, dict]:
    with DATA_FILE.open(encoding="utf-8") as fh:
        data = json.load(fh)
    return {card["card_id"]: card for card in data["cards"]}


@router.get(
    "/soil-lookup/{card_id}",
    response_model=SoilLookupOut,
    summary="Look up a Soil Health Card by ID (simulated)",
    description=(
        "Returns simulated Soil Health Card data for the given card ID. "
        "This is DEMO DATA — it does not contact any government portal. "
        "The returned record includes the issued date so the frontend can "
        "compute card age/staleness."
    ),
)
def get_soil_lookup(card_id: str) -> SoilLookupOut:
    cards = _load_cards()
    card = cards.get(card_id)
    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Soil Health Card found for ID '{card_id}'. "
            "Try 'MH-PN-2024-001234' or 'MH-PN-2024-005678' (demo cards).",
        )

    results = card["results"]
    grades = card.get("nutrient_grades")

    return SoilLookupOut(
        card_id=card["card_id"],
        issued_date=card["issued_date"],
        village=card["village"],
        district=card["district"],
        state=card["state"],
        soil_type=card.get("soil_type"),
        irrigation=card.get("irrigation"),
        results=SoilResults(
            ph=results["ph"],
            ec_ds_per_m=results["ec_ds_per_m"],
            organic_carbon_percent=results["organic_carbon_percent"],
            available_n_kg_per_ha=results["available_n_kg_per_ha"],
            available_p_kg_per_ha=results["available_p_kg_per_ha"],
            available_k_kg_per_ha=results["available_k_kg_per_ha"],
            sulphur_kg_per_ha=results.get("sulphur_kg_per_ha"),
            zinc_ppm=results.get("zinc_ppm"),
            boron_ppm=results.get("boron_ppm"),
            iron_ppm=results.get("iron_ppm"),
            manganese_ppm=results.get("manganese_ppm"),
            copper_ppm=results.get("copper_ppm"),
        ),
        nutrient_grades=NutrientGrades(**grades) if grades else None,
        recommendations_text=card.get("recommendations_text"),
    )


__all__ = ["router"]
