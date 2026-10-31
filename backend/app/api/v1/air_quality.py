from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_open_meteo_client, get_openaq_client
from app.services.providers.open_meteo import OpenMeteoClient
from app.services.providers.openaq import OpenAQClient

router = APIRouter(prefix="/air-quality", tags=["Air Quality & Atmospheric Composition"])


@router.get("", summary="Air Quality Telemetry & Pollutants Overview")
async def get_air_quality_overview(
    latitude: float = Query(default=52.5200, ge=-90.0, le=90.0, description="Latitude (default: Berlin)"),
    longitude: float = Query(default=13.4050, ge=-180.0, le=180.0, description="Longitude (default: Berlin)"),
    client: OpenMeteoClient = Depends(get_open_meteo_client),
):
    """
    Primary Air Quality Endpoint (/api/v1/air-quality).
    Returns real-time atmospheric composition (PM2.5, PM10, NO2, O3, SO2, CO) from CAMS.
    """
    return await client.get_air_quality(latitude=latitude, longitude=longitude)


@router.get("/current", summary="Atmospheric Composition (CAMS Model-Derived)")
async def get_air_quality_current(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    client: OpenMeteoClient = Depends(get_open_meteo_client),
):
    """
    Fetch model-derived air quality metrics (PM2.5, PM10, NO2, O3, SO2, CO) from CAMS.
    Modality: MODEL_DERIVED.
    """
    return await client.get_air_quality(latitude=latitude, longitude=longitude)


@router.get("/stations", summary="Physical Monitoring Stations (OpenAQ v3)")
async def get_nearby_monitoring_stations(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_meters: int = Query(25000, ge=1000, le=250000),
    limit: int = Query(10, ge=1, le=50),
    client: OpenAQClient = Depends(get_openaq_client),
):
    """
    Discover physical ground-level monitoring stations within search radius.
    Modality: OBSERVATION (ground sensors).
    """
    return await client.get_nearby_locations(
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
        limit=limit,
    )
