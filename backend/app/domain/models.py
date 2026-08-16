"""Task 1.1 — product/domain definitions shared by the nutrient engine.

Pure dataclasses and enums. No FastAPI, no pydantic, no DB.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from enum import Enum

#: Exact factor recorded in backend/data/icar_tables.json -> units.hectare_to_acre.
ACRES_PER_HECTARE = 2.4710538


def round_half_up(value: float, digits: int = 0) -> float:
    """Round half away from zero.

    Python's built-in ``round`` uses banker's rounding, which does NOT reproduce
    the AICRP-STCR published ready reckoner: at T=40, SP=25 the equation gives
    exactly 34.5 and the source prints 35, whereas ``round(34.5)`` gives 34.
    See docs/sources.md §Derivations D2.
    """
    quant = Decimal(1).scaleb(-digits)
    return float(Decimal(str(value)).quantize(quant, rounding=ROUND_HALF_UP))


class LandUnit(str, Enum):
    ACRE = "acre"
    HECTARE = "hectare"


class RecommendationMode(str, Enum):
    #: Blanket state/university recommended dose, ignoring soil test values.
    BLANKET_RDF = "blanket_rdf"
    #: AICRP-STCR soil-test-and-target-yield based prescription.
    STCR = "stcr"


class NutrientStatus(str, Enum):
    OK = "ok"
    #: Deliberately withheld because a data-layer guard forbids computing it.
    BLOCKED = "blocked"


@dataclass(frozen=True)
class Plot:
    area: float
    unit: LandUnit = LandUnit.ACRE

    def __post_init__(self) -> None:
        if self.area <= 0:
            raise ValueError("plot area must be greater than zero")

    @property
    def hectares(self) -> float:
        if self.unit is LandUnit.HECTARE:
            return self.area
        return self.area / ACRES_PER_HECTARE


@dataclass(frozen=True)
class SoilTest:
    """Soil Health Card values, in kg/ha as printed on the card.

    ``p`` is deliberately named ``p`` and not ``p2o5``: whether the STCR ``SP``
    term is on an elemental-P or a P2O5 basis is unresolved (R2a), so this
    class refuses to imply either. See GUARD-R2A-P2O5.
    """

    n: float
    p: float
    k: float

    def __post_init__(self) -> None:
        for name in ("n", "p", "k"):
            if getattr(self, name) < 0:
                raise ValueError(f"soil test {name} cannot be negative")


@dataclass(frozen=True)
class NutrientAmount:
    """One nutrient figure, which may legitimately be unavailable."""

    nutrient: str
    kg: float | None
    status: NutrientStatus = NutrientStatus.OK
    reason_code: str | None = None
    reason: str | None = None

    @property
    def available(self) -> bool:
        return self.status is NutrientStatus.OK and self.kg is not None

    @classmethod
    def blocked(cls, nutrient: str, reason_code: str, reason: str) -> NutrientAmount:
        return cls(
            nutrient=nutrient,
            kg=None,
            status=NutrientStatus.BLOCKED,
            reason_code=reason_code,
            reason=reason,
        )


@dataclass(frozen=True)
class NutrientRequirement:
    """Nutrient requirement for a specific area (not per hectare)."""

    n: NutrientAmount
    p2o5: NutrientAmount
    k2o: NutrientAmount

    def __iter__(self):
        return iter((self.n, self.p2o5, self.k2o))


@dataclass(frozen=True)
class ProductDose:
    product_key: str
    product_name: str
    grade: str
    kg: float
    #: Whole retail bags, always rounded UP — a farmer cannot buy a part bag,
    #: and rounding down would under-apply.
    bags: int = 0
    bag_size_kg: float = 50.0
    supplies: dict[str, float] = field(default_factory=dict)
    note: str | None = None


@dataclass(frozen=True)
class NpkRatio:
    """N : P2O5 : K2O reduced to its normalized form.

    Normalized relative to K2O (potash) — the convention behind the familiar
    Indian 4:2:1 NPK use-ratio target. Falls back to the smallest non-zero
    component when K2O is zero, so there is never a division by zero.
    """

    n: float
    p2o5: float
    k2o: float

    def __str__(self) -> str:
        def fmt(v: float) -> str:
            return str(int(v)) if float(v).is_integer() else f"{v:g}"

        return f"{fmt(self.n)}:{fmt(self.p2o5)}:{fmt(self.k2o)}"

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.n, self.p2o5, self.k2o)


@dataclass(frozen=True)
class FertilizerPlan:
    doses: tuple[ProductDose, ...]
    #: Nitrogen (kg) contributed by the phosphate carrier and therefore NOT
    #: bought as urea. This is the DAP nitrogen deduction.
    dap_nitrogen_credit_kg: float = 0.0
    #: Set when the phosphate carrier alone already exceeds the N requirement.
    excess_nitrogen_kg: float = 0.0

    def dose_for(self, product_key: str) -> ProductDose | None:
        for dose in self.doses:
            if dose.product_key == product_key:
                return dose
        return None

    def kg_of(self, product_key: str) -> float:
        dose = self.dose_for(product_key)
        return dose.kg if dose else 0.0


@dataclass(frozen=True)
class Provenance:
    entry_id: str
    source_name: str
    source_url: str
    source_locator: str | None = None
    basis: str | None = None


@dataclass(frozen=True)
class Notice:
    """A machine-readable caveat attached to a recommendation."""

    code: str
    severity: str  # "info" | "warning" | "blocking"
    message: str
    reference: str | None = None


@dataclass(frozen=True)
class Recommendation:
    mode: RecommendationMode
    plot: Plot
    per_hectare: NutrientRequirement
    per_plot: NutrientRequirement
    plan: FertilizerPlan
    provenance: Provenance
    notices: tuple[Notice, ...] = ()
    npk_ratio: NpkRatio | None = None

    @property
    def has_blocking_notice(self) -> bool:
        return any(n.severity == "blocking" for n in self.notices)
