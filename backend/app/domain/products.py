"""Task 1.1 — fertilizer product definitions.

These are *product specifications*, not agronomic recommendations. They come
from the Fertiliser (Control) Order, 1985 statutory grades and are additionally
cross-validated against MPKV Rahuri's own published worked example (see
`docs/sources.md` and `test_engine.py::test_engine_reproduces_mpkv_published_quantities`).

Nutrient content is expressed as the percentage by weight of the *nutrient
oxide* conventionally declared on the bag: N as elemental N, phosphorus as
P2O5, potassium as K2O.
"""

from __future__ import annotations

from dataclasses import dataclass

#: Central Fertiliser Quality Control & Training Institute (CFQC&TI),
#: Department of Agriculture & Farmers Welfare — "Specifications of Important
#: Fertilisers", giving the Fertiliser (Control) Order 1985 statutory grades.
FCO_SOURCE_URL = "https://cfqcti.dacnet.nic.in/lst9.3spcei.htm"
FCO_SOURCE_NAME = (
    "Fertiliser (Control) Order, 1985 — statutory grades, as published by CFQC&TI, "
    "Department of Agriculture & Farmers Welfare"
)


#: Retail bag sizes in India. Urea moved to a 45 kg bag; DAP and MOP remain
#: 50 kg. The Department of Fertilizers publishes the statutory urea MRP for
#: both a 50 kg and a 45 kg bag, the 45 kg bag being the current retail unit.
BAG_SOURCE_URL = "https://www.fert.nic.in/urea-pricing-policy-section"
BAG_SOURCE_NAME = "Department of Fertilizers, Government of India — urea pricing policy"


@dataclass(frozen=True)
class FertilizerProduct:
    """A straight fertilizer with a fixed declared grade."""

    key: str
    name: str
    local_names: tuple[str, ...]
    n_percent: float
    p2o5_percent: float
    k2o_percent: float
    #: Retail bag weight in kg. Farmers buy whole bags, so plans are also
    #: expressed in bags, always rounded UP (never round a farmer short).
    bag_size_kg: float = 50.0
    source_name: str = FCO_SOURCE_NAME
    source_url: str = FCO_SOURCE_URL

    @property
    def n_fraction(self) -> float:
        return self.n_percent / 100.0

    @property
    def p2o5_fraction(self) -> float:
        return self.p2o5_percent / 100.0

    @property
    def k2o_fraction(self) -> float:
        return self.k2o_percent / 100.0

    @property
    def grade(self) -> str:
        """The conventional N-P-K grade string, e.g. '18-46-0' for DAP."""
        def fmt(v: float) -> str:
            return str(int(v)) if float(v).is_integer() else str(v)

        return f"{fmt(self.n_percent)}-{fmt(self.p2o5_percent)}-{fmt(self.k2o_percent)}"

    def kg_to_supply(self, nutrient: str, kg_nutrient: float) -> float:
        """kg of this product needed to supply `kg_nutrient` of `nutrient`."""
        fraction = {
            "n": self.n_fraction,
            "p2o5": self.p2o5_fraction,
            "k2o": self.k2o_fraction,
        }[nutrient]
        if fraction <= 0:
            raise ValueError(f"{self.name} supplies no {nutrient}")
        return kg_nutrient / fraction

    def nutrient_supplied(self, nutrient: str, kg_product: float) -> float:
        """kg of `nutrient` delivered by `kg_product` kg of this product."""
        fraction = {
            "n": self.n_fraction,
            "p2o5": self.p2o5_fraction,
            "k2o": self.k2o_fraction,
        }[nutrient]
        return kg_product * fraction


#: Urea — FCO grade 46-0-0.
UREA = FertilizerProduct(
    key="urea",
    name="Urea",
    local_names=("युरिया",),
    n_percent=46.0,
    p2o5_percent=0.0,
    k2o_percent=0.0,
    bag_size_kg=45.0,
)

#: Di-Ammonium Phosphate — FCO grade 18-46-0. Note it carries nitrogen as well
#: as phosphate; that nitrogen MUST be deducted from the urea requirement.
DAP = FertilizerProduct(
    key="dap",
    name="DAP (Di-Ammonium Phosphate)",
    local_names=("डीएपी",),
    n_percent=18.0,
    p2o5_percent=46.0,
    k2o_percent=0.0,
)

#: Muriate of Potash (potassium chloride) — FCO grade 0-0-60.
MOP = FertilizerProduct(
    key="mop",
    name="MOP (Muriate of Potash)",
    local_names=("पोटॅश",),
    n_percent=0.0,
    p2o5_percent=0.0,
    k2o_percent=60.0,
)

#: The straight-fertilizer basket the engine allocates from, in the order it
#: allocates them: phosphate carrier first (because it also supplies N), then
#: the nitrogen top-up, then potash.
DEFAULT_PRODUCTS: tuple[FertilizerProduct, ...] = (DAP, UREA, MOP)

PRODUCTS_BY_KEY: dict[str, FertilizerProduct] = {p.key: p for p in DEFAULT_PRODUCTS}
