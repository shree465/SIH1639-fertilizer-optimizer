"""Loader for backend/data/icar_tables.json — the Phase 0 agricultural data layer.

This module is the ONLY place that reads that file. It exposes the entries and,
critically, the `engine_guards` that the engine must honour. Nothing here
invents or normalises a value; it reads what Phase 0 recorded.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

#: backend/app/domain/tables.py -> backend/data/icar_tables.json
DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "icar_tables.json"

BLANKET_RDF_ENTRY_ID = "rice-mh-mpkv-rdf"
STCR_ENTRY_ID = "rice-mh-stcr-transplanted-rahuri"
GUARD_R2A_P2O5 = "GUARD-R2A-P2O5"


class DataLayerError(RuntimeError):
    """The data file is missing, malformed, or missing something required."""


@dataclass(frozen=True)
class EngineGuard:
    id: str
    severity: str
    applies_to_entry: str
    rule: str
    reason: str
    permitted_uses: tuple[str, ...]
    forbidden_uses: tuple[str, ...]
    required_behaviour_until_resolved: str
    clears_when: str

    @property
    def is_blocking(self) -> bool:
        return self.severity == "blocking"


@lru_cache(maxsize=1)
def load_tables() -> dict[str, Any]:
    if not DATA_FILE.exists():
        raise DataLayerError(f"nutrient data file not found: {DATA_FILE}")
    try:
        with DATA_FILE.open(encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:  # pragma: no cover - corrupt file
        raise DataLayerError(f"nutrient data file is not valid JSON: {exc}") from exc


@lru_cache(maxsize=1)
def entries_by_id() -> dict[str, dict[str, Any]]:
    return {e["id"]: e for e in load_tables()["entries"]}


def get_entry(entry_id: str) -> dict[str, Any]:
    try:
        return entries_by_id()[entry_id]
    except KeyError as exc:
        raise DataLayerError(f"no entry {entry_id!r} in {DATA_FILE.name}") from exc


@lru_cache(maxsize=1)
def guards_by_id() -> dict[str, EngineGuard]:
    guards: dict[str, EngineGuard] = {}
    for raw in load_tables().get("engine_guards", []):
        guards[raw["id"]] = EngineGuard(
            id=raw["id"],
            severity=raw["severity"],
            applies_to_entry=raw["applies_to_entry"],
            rule=raw["rule"],
            reason=raw["reason"],
            permitted_uses=tuple(raw.get("permitted_uses", ())),
            forbidden_uses=tuple(raw.get("forbidden_uses", ())),
            required_behaviour_until_resolved=raw["required_behaviour_until_resolved"],
            clears_when=raw["clears_when"],
        )
    return guards


def get_guard(guard_id: str) -> EngineGuard:
    try:
        return guards_by_id()[guard_id]
    except KeyError as exc:
        raise DataLayerError(f"no engine guard {guard_id!r} in {DATA_FILE.name}") from exc


def is_guard_active(guard_id: str) -> bool:
    """A guard is active while the research item that `enforced_by` it is PENDING.

    This is what makes the guard self-clearing: when someone resolves R2a and
    flips its status to RESOLVED, the guard stops applying automatically and no
    engine code has to change.
    """
    guard = get_guard(guard_id)
    for item in load_tables().get("outstanding_research", []):
        if item.get("enforced_by") == guard.id:
            return item.get("status", "PENDING").upper() != "RESOLVED"
    # A guard with no linked research item is treated as active: fail closed.
    return True


def hectare_to_acre() -> float:
    return float(load_tables()["units"]["hectare_to_acre"])


def stcr_equation_coefficients(entry_id: str = STCR_ENTRY_ID) -> dict[str, dict[str, float]]:
    """Return {nutrient: {'target': a, 'soil': b}} for F = a*T - b*S."""
    eqs = get_entry(entry_id)["soil_test_adjustment"]["equations"]
    out: dict[str, dict[str, float]] = {}
    for nutrient in ("n", "p2o5", "k2o"):
        out[nutrient] = {
            "target": float(eqs[nutrient]["target_coefficient"]),
            "soil": float(eqs[nutrient]["soil_test_coefficient"]),
        }
    return out


def stcr_minimum_dose(entry_id: str = STCR_ENTRY_ID) -> dict[str, float | None]:
    md = get_entry(entry_id)["soil_test_adjustment"]["minimum_dose"]
    return {
        "n": md.get("n_kg_per_ha"),
        "p2o5": md.get("p2o5_kg_per_ha"),
        "k2o": md.get("k2o_kg_per_ha"),
    }


def stcr_ready_reckoner(entry_id: str = STCR_ENTRY_ID) -> dict[str, Any]:
    return get_entry(entry_id)["soil_test_adjustment"]["published_ready_reckoner"]


def provenance_for(entry_id: str) -> dict[str, str]:
    entry = get_entry(entry_id)
    source = load_tables()["sources"][entry["source_ref"]]
    return {
        "entry_id": entry_id,
        "source_name": source["publisher"] + " — " + source["title"],
        "source_url": entry["source_url"],
        "source_locator": entry.get("source_locator", ""),
    }
