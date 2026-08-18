"""Task 1.4 — POST /recommend.

A thin adapter. All agronomy lives in `app.services.nutrient_engine`; this
module only translates HTTP payloads to and from domain objects.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.domain.models import Plot, Recommendation, SoilTest
from app.domain.tables import DataLayerError
from app.schemas.recommend import (
    DoseOut,
    NoticeOut,
    NutrientOut,
    PlanOut,
    PlotOut,
    ProvenanceOut,
    RecommendIn,
    RecommendOut,
    RequirementOut,
)
from app.services.nutrient_engine import (
    EngineError,
    RecommendationRequest,
    recommend,
)

router = APIRouter(tags=["recommendation"])


def _nutrient_out(amount) -> NutrientOut:
    return NutrientOut(
        nutrient=amount.nutrient,
        kg=amount.kg,
        status=amount.status.value,
        reason_code=amount.reason_code,
        reason=amount.reason,
    )


def _requirement_out(req) -> RequirementOut:
    return RequirementOut(
        n=_nutrient_out(req.n),
        p2o5=_nutrient_out(req.p2o5),
        k2o=_nutrient_out(req.k2o),
    )


def _to_response(rec: Recommendation) -> RecommendOut:
    return RecommendOut(
        mode=rec.mode,
        plot=PlotOut(
            area=rec.plot.area, unit=rec.plot.unit, hectares=round(rec.plot.hectares, 6)
        ),
        requirement_per_hectare=_requirement_out(rec.per_hectare),
        requirement_per_plot=_requirement_out(rec.per_plot),
        npk_ratio=str(rec.npk_ratio) if rec.npk_ratio else None,
        fertilizer_plan=PlanOut(
            doses=[
                DoseOut(
                    product_key=d.product_key,
                    product_name=d.product_name,
                    grade=d.grade,
                    kg=d.kg,
                    bags=d.bags,
                    bag_size_kg=d.bag_size_kg,
                    supplies=d.supplies,
                    note=d.note,
                )
                for d in rec.plan.doses
            ],
            dap_nitrogen_credit_kg=rec.plan.dap_nitrogen_credit_kg,
            excess_nitrogen_kg=rec.plan.excess_nitrogen_kg,
        ),
        provenance=ProvenanceOut(
            entry_id=rec.provenance.entry_id,
            source_name=rec.provenance.source_name,
            source_url=rec.provenance.source_url,
            source_locator=rec.provenance.source_locator or None,
            basis=rec.provenance.basis,
        ),
        notices=[
            NoticeOut(
                code=n.code, severity=n.severity, message=n.message, reference=n.reference
            )
            for n in rec.notices
        ],
        has_blocking_notice=rec.has_blocking_notice,
    )


@router.post(
    "/recommend",
    response_model=RecommendOut,
    summary="Fertilizer recommendation for a plot",
    description=(
        "Returns the nutrient requirement and a straight-fertilizer plan (DAP, urea, MOP) "
        "for the given plot.\n\n"
        "Nitrogen supplied by DAP is deducted from the urea figure — applying full-rate "
        "urea alongside DAP is the over-application this endpoint exists to correct.\n\n"
        "In `stcr` mode a figure may be returned as `null` with `status: \"blocked\"` and a "
        "`reason_code`. That is deliberate: a data-layer guard forbids computing it while "
        "the underlying source ambiguity is unresolved. It is never silently guessed."
    ),
)
def post_recommend(payload: RecommendIn) -> RecommendOut:
    try:
        request = RecommendationRequest(
            plot=Plot(area=payload.plot.area, unit=payload.plot.unit),
            mode=payload.mode,
            soil_test=(
                SoilTest(n=payload.soil_test.n, p=payload.soil_test.p, k=payload.soil_test.k)
                if payload.soil_test
                else None
            ),
            target_yield_q_per_ha=payload.target_yield_q_per_ha,
        )
    except (EngineError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    try:
        result = recommend(request)
    except DataLayerError as exc:  # pragma: no cover - misconfigured deployment
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"nutrient data layer unavailable: {exc}",
        ) from exc
    except EngineError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    return _to_response(result)


__all__ = ["router"]
