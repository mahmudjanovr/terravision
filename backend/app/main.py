from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.db.session import get_engine, close_db_engine
from app.services.cache import get_redis_client, close_redis
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: attempt DB engine and Redis connection pool
    logger.info("TERRAVISION FastAPI Backend starting up...")
    try:
        _ = get_engine()
        _ = await get_redis_client()
    except Exception as e:
        logger.warning(f"Non-critical startup warning: {e}")

    yield

    # Shutdown: cleanly close connections
    logger.info("TERRAVISION FastAPI Backend shutting down...")
    await close_db_engine()
    await close_redis()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "platform": "TERRAVISION",
        "description": "Global Environmental Intelligence Platform",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": f"{settings.API_V1_PREFIX}",
        "endpoints": {
            "health": f"{settings.API_V1_PREFIX}/health",
            "weather": f"{settings.API_V1_PREFIX}/environmental/weather/current",
            "historical_climate": f"{settings.API_V1_PREFIX}/climate/historical",
            "air_quality": f"{settings.API_V1_PREFIX}/air-quality/current",
            "stations": f"{settings.API_V1_PREFIX}/air-quality/stations",
            "nasa_power": f"{settings.API_V1_PREFIX}/environmental/nasa-power",
            "data_sources": f"{settings.API_V1_PREFIX}/data-sources",
        },
    }
