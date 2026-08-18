"""Economics calculation service — pure Python, no framework dependencies.

Computes the cost difference between a farmer's current fertilizer use and the
recommended plan, using MRP data from backend/data/mrp.json.

No yield gain is fabricated. This module computes input-cost economics only.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "mrp.json"


class EconomicsDataError(RuntimeError):
    """MRP data file is missing or malformed."""


@dataclass(frozen=True)
class ProductPrice:
    product_key: str
    mrp_per_bag: float
    bag_size_kg: float
    source: str
    source_url: str
    note: str
    price_basis: str


@lru_cache(maxsize=1)
def load_mrp() -> dict[str, ProductPrice]:
    if not DATA_FILE.exists():
        raise EconomicsDataError(f"MRP data file not found: {DATA_FILE}")
    try:
        with DATA_FILE.open(encoding="utf-8") as fh:
            raw = json.load(fh)
    except json.JSONDecodeError as exc:
        raise EconomicsDataError(f"MRP data file is not valid JSON: {exc}") from exc

    prices: dict[str, ProductPrice] = {}
    for key, entry in raw["prices"].items():
        prices[key] = ProductPrice(
            product_key=entry["product_key"],
            mrp_per_bag=float(entry["mrp_per_bag"]),
            bag_size_kg=float(entry["bag_size_kg"]),
            source=entry["source"],
            source_url=entry["source_url"],
            note=entry["note"],
            price_basis=entry["price_basis"],
        )
    return prices


@dataclass(frozen=True)
class CostBreakdownItem:
    product_key: str
    bags: float
    mrp_per_bag: float
    cost: float


@dataclass(frozen=True)
class EconomicsResult:
    current_cost: float
    recommended_cost: float
    savings: float  # positive = farmer saves money
    current_breakdown: tuple[CostBreakdownItem, ...]
    recommended_breakdown: tuple[CostBreakdownItem, ...]
    assumptions: tuple[str, ...]


def compute_economics(
    current_bags: dict[str, float],
    recommended_bags: dict[str, float],
) -> EconomicsResult:
    """Compute current cost, recommended cost, and net position.

    Args:
        current_bags: e.g. {"urea": 3, "dap": 1, "mop": 0}
        recommended_bags: same structure

    Returns:
        EconomicsResult with all three numbers and breakdowns.
    """
    prices = load_mrp()
    assumptions: list[str] = []

    def _breakdown(bags: dict[str, float]) -> tuple[list[CostBreakdownItem], float]:
        items: list[CostBreakdownItem] = []
        total = 0.0
        for key in ("urea", "dap", "mop"):
            count = max(bags.get(key, 0), 0)
            if key not in prices:
                continue
            p = prices[key]
            cost = count * p.mrp_per_bag
            total += cost
            items.append(CostBreakdownItem(
                product_key=key,
                bags=count,
                mrp_per_bag=p.mrp_per_bag,
                cost=round(cost, 2),
            ))
        return items, round(total, 2)

    current_items, current_total = _breakdown(current_bags)
    recommended_items, recommended_total = _breakdown(recommended_bags)

    # Collect assumptions from any non-statutory prices
    for key in ("urea", "dap", "mop"):
        if key in prices and prices[key].price_basis not in ("statutory",):
            assumptions.append(
                f"{prices[key].product_key.upper()} MRP ₹{prices[key].mrp_per_bag}/bag: "
                f"{prices[key].note}"
            )

    return EconomicsResult(
        current_cost=current_total,
        recommended_cost=recommended_total,
        savings=round(current_total - recommended_total, 2),
        current_breakdown=tuple(current_items),
        recommended_breakdown=tuple(recommended_items),
        assumptions=tuple(assumptions),
    )
