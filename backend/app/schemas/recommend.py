"""Pydantic schemas for POST /recommend.

These are the HTTP boundary only. They translate to and from the pure domain
objects in `app.domain`; the engine itself knows nothing about pydantic.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.domain.models import LandUnit, RecommendationMode


class PlotIn(BaseModel):
    area: float = Field(gt=0, description="Plot size, in the given unit.", examples=[1.0])
    unit: LandUnit = Field(default=LandUnit.ACRE, description="acre or hectare.")


class SoilTestIn(BaseModel):
    """Soil Health Card values in kg/ha, as printed on the card.

    `p` is intentionally not called `p2o5`: whether the STCR SP term is on an
    elemental-P or P2O5 basis is an unresolved research item (R2a), so the API
    does not imply either.
    """

    n: float = Field(ge=0, description="Available nitrogen, kg/ha.", examples=[213.0])
    p: float = Field(ge=0, description="Available phosphorus, kg/ha.", examples=[17.4])
    k: float = Field(ge=0, description="Available potassium, kg/ha.", examples=[286.0])


class RecommendIn(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "plot": {"area": 1.0, "unit": "acre"},
                    "mode": "blanket_rdf",
                },
                {
                    "plot": {"area": 1.0, "unit": "acre"},
                    "mode": "stcr",
                    "soil_test": {"n": 213.0, "p": 17.4, "k": 286.0},
                    "target_yield_q_per_ha": 42.0,
                },
            ]
        }
    )

    plot: PlotIn
    mode: RecommendationMode = RecommendationMode.BLANKET_RDF
    soil_test: SoilTestIn | None = Field(
        default=None, description="Required when mode is 'stcr'."
    )
    target_yield_q_per_ha: float | None = Field(
        default=None, gt=0, description="Required when mode is 'stcr'. Quintal per hectare."
    )


class NutrientOut(BaseModel):
    nutrient: str
    kg: float | None = Field(
        description="Null when the figure is deliberately withheld; see `status`."
    )
    status: str = Field(description="'ok' or 'blocked'.")
    reason_code: str | None = None
    reason: str | None = None


class RequirementOut(BaseModel):
    n: NutrientOut
    p2o5: NutrientOut
    k2o: NutrientOut


class DoseOut(BaseModel):
    product_key: str
    product_name: str
    grade: str
    kg: float
    bags: int = Field(
        default=0,
        description="Whole retail bags, rounded UP — a farmer cannot buy a part bag.",
    )
    bag_size_kg: float = Field(
        default=50.0, description="Retail bag weight: urea 45 kg, DAP and MOP 50 kg."
    )
    supplies: dict[str, float] = {}
    note: str | None = None


class PlanOut(BaseModel):
    doses: list[DoseOut]
    dap_nitrogen_credit_kg: float = Field(
        description=(
            "Nitrogen (kg) supplied by DAP and therefore deducted from the urea "
            "requirement. This is the urea over-application correction."
        )
    )
    excess_nitrogen_kg: float = Field(
        default=0.0,
        description="Nitrogen oversupplied by DAP alone, when it exceeds the requirement.",
    )


class ProvenanceOut(BaseModel):
    entry_id: str
    source_name: str
    source_url: str
    source_locator: str | None = None
    basis: str | None = None


class NoticeOut(BaseModel):
    code: str
    severity: str
    message: str
    reference: str | None = None


class PlotOut(BaseModel):
    area: float
    unit: LandUnit
    hectares: float


class RecommendOut(BaseModel):
    mode: RecommendationMode
    plot: PlotOut
    npk_ratio: str | None = Field(
        default=None,
        description="N:P2O5:K2O normalized by the smallest non-zero component, e.g. '2:1:1'.",
    )
    requirement_per_hectare: RequirementOut
    requirement_per_plot: RequirementOut
    fertilizer_plan: PlanOut
    provenance: ProvenanceOut
    notices: list[NoticeOut] = []
    has_blocking_notice: bool = Field(
        description="True when some figure was withheld by a data-layer guard."
    )
