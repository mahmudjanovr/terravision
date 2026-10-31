from typing import List
from fastapi import APIRouter
from app.schemas.provider import DataSourceMetadata

router = APIRouter(prefix="/data-sources", tags=["Data Sources & Catalog"])

DATA_SOURCES_CATALOG: List[dict] = [
    {
        "id": "open-meteo",
        "name": "Open-Meteo Weather API",
        "category": "Atmospheric & Weather",
        "spatial_coverage": "Global",
        "spatial_resolution": "1 km to 11 km (ECMWF IFS / GFS / ICON)",
        "temporal_coverage": "Operational real-time & 7-14 day forecast",
        "temporal_resolution": "Hourly",
        "data_modality": "FORECAST",
        "access_tier": "Free / Open Data",
        "latency": "Real-time (< 300ms)",
        "status": "OPERATIONAL",
        "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)",
        "doc_url": "https://open-meteo.com/en/docs",
        "supported_parameters": [
            "temperature_2m",
            "relative_humidity_2m",
            "wind_speed_10m",
            "wind_direction_10m",
            "surface_pressure",
            "precipitation",
        ],
    },
    {
        "id": "open-meteo-archive",
        "name": "Open-Meteo Historical Archive (ERA5 / ERA5-Land)",
        "category": "Climate Reanalysis",
        "spatial_coverage": "Global",
        "spatial_resolution": "ERA5: ~0.25° (~25 km); ERA5-Land: ~0.1° (~11 km)",
        "temporal_coverage": "1940 to present (5-day latency)",
        "temporal_resolution": "Hourly",
        "data_modality": "HISTORICAL_REANALYSIS",
        "access_tier": "Free / Open Data",
        "latency": "< 2s (Cached / Reanalysis)",
        "status": "OPERATIONAL",
        "attribution": "Copernicus Climate Change Service (C3S) / ECMWF via Open-Meteo",
        "doc_url": "https://archive-api.open-meteo.com/v1/archive",
        "supported_parameters": [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
        ],
    },
    {
        "id": "nasa-power",
        "name": "NASA POWER Project",
        "category": "Solar Radiation & Meteorology",
        "spatial_coverage": "Global",
        "spatial_resolution": "0.5° × 0.625° (MERRA-2 assimilation grid)",
        "temporal_coverage": "1981 to near real-time",
        "temporal_resolution": "Hourly / Daily",
        "data_modality": "REANALYSIS",
        "access_tier": "Public Open Access",
        "latency": "Sub-second (< 1s)",
        "status": "OPERATIONAL",
        "attribution": "NASA Langley Research Center POWER Project / MERRA-2",
        "doc_url": "https://power.larc.nasa.gov",
        "supported_parameters": [
            "ALLSKY_SFC_SW_DWN",
            "T2M",
            "RH2M",
            "WS10M",
            "PRECTOTCORR",
        ],
    },
    {
        "id": "openaq",
        "name": "OpenAQ API v3",
        "category": "Air Quality (Physical In-situ Monitoring)",
        "spatial_coverage": "Global (Station-based in >100 countries)",
        "spatial_resolution": "In-situ physical monitoring station coordinates",
        "temporal_coverage": "Historical archives & real-time streams",
        "temporal_resolution": "Station-dependent (10-min to 1-hour)",
        "data_modality": "OBSERVATION",
        "access_tier": "API Key Required (Free Community Tier)",
        "latency": "< 500ms",
        "status": "OPERATIONAL",
        "attribution": "OpenAQ Community / Contributors (CC BY 4.0)",
        "doc_url": "https://docs.openaq.org",
        "supported_parameters": [
            "pm25",
            "pm10",
            "no2",
            "o3",
            "so2",
            "co",
        ],
    },
    {
        "id": "copernicus-cds",
        "name": "Copernicus Climate Data Store (CDS)",
        "category": "Climate & Atmospheric Modeling",
        "spatial_coverage": "Global",
        "spatial_resolution": "ERA5 ~0.25° (~25 km); IFS ~9 km",
        "temporal_coverage": "1940 to present",
        "temporal_resolution": "Hourly",
        "data_modality": "REANALYSIS",
        "access_tier": "Account & API Key Required",
        "latency": "Asynchronous Batch Processing (Queue-based)",
        "status": "NOT_CONFIGURED",
        "attribution": "European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus",
        "doc_url": "https://cds.climate.copernicus.eu",
        "supported_parameters": [
            "2m_temperature",
            "total_precipitation",
            "surface_solar_radiation_downwards",
        ],
    },
]


@router.get("", response_model=List[DataSourceMetadata], summary="List Data Sources Catalog")
async def list_data_sources():
    """
    Returns the complete TERRAVISION environmental intelligence data source catalog
    with verified spatial resolutions, modalities, and access tiers.
    """
    return [DataSourceMetadata(**item) for item in DATA_SOURCES_CATALOG]
