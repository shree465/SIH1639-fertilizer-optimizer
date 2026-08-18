"""POST /lcc/reading — Leaf Colour Chart band decision.

The LCC is a real-time nitrogen management tool developed by IRRI. The farmer
compares the colour of the topmost fully expanded leaf against a colour chart
with 4–6 panels. If the leaf colour is below the critical threshold, nitrogen
top dressing is recommended.

Band mapping used here follows the IRRI/ICAR convention for transplanted rice:
  - Band 1–3: below critical → top_dress
  - Band 4–6: at or above critical → hold

No ML model is used. The band is selected by the farmer (manually or using the
camera as a visual aid). No ML accuracy is claimed.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(tags=["lcc"])

# IRRI LCC convention for transplanted rice.
# Critical threshold is band 4 (for most rice varieties).
# Hybrids/sodic soils may use band 3 — not implemented in this demo.
LCC_CRITICAL_THRESHOLD = 4

LCC_BANDS = {
    1: {"colour": "Yellow-green", "description": "Severe nitrogen deficiency"},
    2: {"colour": "Light green", "description": "Nitrogen deficiency"},
    3: {"colour": "Green", "description": "Mild nitrogen deficiency"},
    4: {"colour": "Dark green", "description": "Adequate nitrogen"},
    5: {"colour": "Very dark green", "description": "Sufficient nitrogen"},
    6: {"colour": "Deep dark green", "description": "Excess nitrogen — avoid application"},
}


class LccReadingIn(BaseModel):
    band: int = Field(
        ge=1, le=6,
        description="LCC band selected by the farmer (1 = yellowish-green, 6 = deep dark green).",
    )
    method: str = Field(
        default="manual",
        description="How the band was determined: 'camera_visual' or 'manual'.",
    )


class LccReadingOut(BaseModel):
    band: int
    colour: str
    description: str
    decision: str = Field(description="'top_dress' or 'hold'.")
    explanation: str
    method: str
    critical_threshold: int = Field(
        description="The critical LCC band value used for the decision.",
    )
    source: str = Field(
        default=(
            "IRRI (International Rice Research Institute) — "
            "Leaf Color Chart for nitrogen management in rice"
        ),
    )
    source_url: str = Field(
        default="http://www.irri.org/resources/publications/leaf-color-chart",
    )


@router.post(
    "/lcc/reading",
    response_model=LccReadingOut,
    summary="Submit an LCC reading and get a nitrogen top-dressing decision",
    description=(
        "Takes a Leaf Colour Chart band (1–6) and returns whether to top-dress "
        "nitrogen or hold. Based on the IRRI/ICAR convention for transplanted rice. "
        "No ML model is used — the farmer selects the band manually or uses the "
        "camera as a visual aid."
    ),
)
def post_lcc_reading(payload: LccReadingIn) -> LccReadingOut:
    band_info = LCC_BANDS.get(payload.band)
    if band_info is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"LCC band must be 1–6, got {payload.band}",
        )

    if payload.band < LCC_CRITICAL_THRESHOLD:
        decision = "top_dress"
        explanation = (
            f"Leaf colour is band {payload.band} ({band_info['colour']}), "
            f"which is below the critical threshold of {LCC_CRITICAL_THRESHOLD}. "
            "Apply 25–30 kg nitrogen per hectare as top dressing."
        )
    elif payload.band == 6:
        decision = "hold"
        explanation = (
            f"Leaf colour is band {payload.band} ({band_info['colour']}). "
            "The crop has excess nitrogen. Do NOT apply more nitrogen — "
            "over-application at this stage wastes money and increases lodging risk."
        )
    else:
        decision = "hold"
        explanation = (
            f"Leaf colour is band {payload.band} ({band_info['colour']}), "
            f"at or above the critical threshold of {LCC_CRITICAL_THRESHOLD}. "
            "No nitrogen top dressing needed at this time. Re-check in one week."
        )

    return LccReadingOut(
        band=payload.band,
        colour=band_info["colour"],
        description=band_info["description"],
        decision=decision,
        explanation=explanation,
        method=payload.method,
        critical_threshold=LCC_CRITICAL_THRESHOLD,
    )


__all__ = ["router"]
