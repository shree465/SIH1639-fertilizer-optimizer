from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.economics import router as economics_router
from app.api.routes.imbalance import router as imbalance_router
from app.api.routes.lcc import router as lcc_router
from app.api.routes.recommend import router as recommend_router
from app.api.routes.schemes import router as schemes_router
from app.api.routes.soil_lookup import router as soil_lookup_router
from app.core.config import settings

app = FastAPI(
    title="SIH1639 Fertilizer Optimizer API",
    version="0.2.0",
    description="Urea-overuse correction engine for Indian farms",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "env": settings.app_env}


app.include_router(recommend_router)
app.include_router(imbalance_router)
app.include_router(economics_router)
app.include_router(lcc_router)
app.include_router(schemes_router)
app.include_router(soil_lookup_router)
