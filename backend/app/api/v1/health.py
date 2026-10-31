from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.core.config import settings
from app.db.session import check_db_health
from app.services.cache import check_cache_health
from app.api.dependencies import (
    get_open_meteo_client,
    get_archive_client,
    get_nasa_power_client,
    get_openaq_client,
    get_copernicus_client,
)
from app.services.providers.open_meteo import OpenMeteoClient
from app.services.providers.open_meteo_archive import OpenMeteoArchiveClient
from app.services.providers.nasa_power import NasaPowerClient
from app.services.providers.openaq import OpenAQClient
from app.services.providers.copernicus import CopernicusClient

router = APIRouter(prefix="/health", tags=["Health & Status"])


@router.get("", summary="System Health Status")
async def get_system_health(
    om: OpenMeteoClient = Depends(get_open_meteo_client),
    archive: OpenMeteoArchiveClient = Depends(get_archive_client),
    nasa: NasaPowerClient = Depends(get_nasa_power_client),
    openaq: OpenAQClient = Depends(get_openaq_client),
    copernicus: CopernicusClient = Depends(get_copernicus_client),
):
    db_health = await check_db_health()
    cache_health = await check_cache_health()

    providers = {
        "open-meteo": await om.check_health(),
        "open-meteo-archive": await archive.check_health(),
        "nasa-power": await nasa.check_health(),
        "openaq": await openaq.check_health(),
        "copernicus": await copernicus.check_health(),
    }

    # Overall system status logic
    is_healthy = True
    if db_health.get("status") == "unreachable" or cache_health.get("status") == "unreachable":
        system_status = "degraded"
    else:
        system_status = "healthy"

    return {
        "status": system_status,
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_health,
        "cache": cache_health,
        "providers": providers,
    }


@router.get("/providers", summary="Provider Integrations Status")
async def get_provider_health(
    om: OpenMeteoClient = Depends(get_open_meteo_client),
    archive: OpenMeteoArchiveClient = Depends(get_archive_client),
    nasa: NasaPowerClient = Depends(get_nasa_power_client),
    openaq: OpenAQClient = Depends(get_openaq_client),
    copernicus: CopernicusClient = Depends(get_copernicus_client),
):
    return {
        "open-meteo": await om.check_health(),
        "open-meteo-archive": await archive.check_health(),
        "nasa-power": await nasa.check_health(),
        "openaq": await openaq.check_health(),
        "copernicus": await copernicus.check_health(),
    }


@router.get("/db", summary="PostgreSQL / PostGIS Database Health")
async def get_database_health():
    return await check_db_health()


@router.get("/cache", summary="Redis Cache Health")
async def get_cache_health():
    return await check_cache_health()
