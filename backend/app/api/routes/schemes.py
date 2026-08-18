"""POST /schemes/match — rule-based scheme eligibility matcher.

Evaluates a farmer profile against the rules in backend/data/schemes.json.
Each rule is simple, readable, and auditable — no opaque scoring.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter

from app.schemas.schemes import FarmerProfileIn, SchemeOut, SchemesMatchOut

router = APIRouter(tags=["schemes"])

DATA_FILE = Path(__file__).resolve().parents[3] / "data" / "schemes.json"


@lru_cache(maxsize=1)
def _load_schemes() -> list[dict]:
    with DATA_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)["schemes"]


def _match_one(scheme: dict, profile: FarmerProfileIn) -> SchemeOut:
    """Evaluate one scheme against the farmer profile."""
    elig = scheme["eligibility"]
    reasons: list[str] = []
    met = True

    # Check landholding
    if elig.get("is_landholding") and not profile.is_landholding:
        met = False
        reasons.append("Requires landholding farmer.")

    # Check state
    states = elig.get("states", "all")
    if states != "all" and isinstance(states, list) and profile.state not in states:
        met = False
        reasons.append(f"Not available in {profile.state}.")

    # Check crop/season
    crops = elig.get("crops", "all")
    if crops != "all" and isinstance(crops, list):
        # Check if the farmer's crop has "kharif" in it and the scheme has "kharif"
        crop_lower = profile.crop.lower()
        crop_match = any(c.lower() in crop_lower for c in crops)
        if not crop_match:
            met = False
            reasons.append(f"Scheme covers {', '.join(crops)} crops; your crop may not match.")

    if met:
        reason = "Eligibility conditions met based on the provided profile."
    else:
        reason = " ".join(reasons)

    return SchemeOut(
        id=scheme["id"],
        name=scheme["name"],
        description=scheme["description"],
        eligibility_met=met,
        reason=reason,
        how_to_apply=scheme["how_to_apply"],
        source=scheme["source"],
        source_url=scheme["source_url"],
    )


@router.post(
    "/schemes/match",
    response_model=SchemesMatchOut,
    summary="Match a farmer profile against government schemes",
    description=(
        "Evaluates the farmer's profile against a curated set of government schemes "
        "and returns eligibility results with source links. Rules are simple and auditable."
    ),
)
def post_schemes_match(payload: FarmerProfileIn) -> SchemesMatchOut:
    schemes = _load_schemes()
    results = [_match_one(s, payload) for s in schemes]
    return SchemesMatchOut(schemes=results)


__all__ = ["router"]
