from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.environmental import router as environmental_router
from app.api.v1.climate import router as climate_router
from app.api.v1.air_quality import router as air_quality_router
from app.api.v1.data_sources import router as data_sources_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(environmental_router)
api_router.include_router(climate_router)
api_router.include_router(air_quality_router)
api_router.include_router(data_sources_router)
