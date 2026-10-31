from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import (
    get_open_meteo_client,
    get_nasa_power_client,
    get_observation_repo,
)
from app.db.session import get_db
from app.models.environmental_observation import ObservationModality, QualityStatus
from app.repositories.observation_repository import ObservationRepository
from app.schemas.common import PaginatedResponse
from app.schemas.observation import (
    EnvironmentalObservationSchema,
    ObservationCreate,
    NearbyObservationsQuery,
)
from app.schemas.coordinates import GeoCoordinates
from app.services.providers.nasa_power import NasaPowerClient
from app.services.providers.open_meteo import OpenMeteoClient

router = APIRouter(prefix="/environmental", tags=["Environmental Intelligence"])


@router.get("/weather/current", summary="Current Real-time Weather Observations")
async def get_current_weather(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    client: OpenMeteoClient = Depends(get_open_meteo_client),
):
    """
    Fetch current atmospheric weather parameters with preserved coordinate provenance.
    Modality: FORECAST.
    """
    return await client.get_current_weather(latitude=latitude, longitude=longitude)


@router.get("/nasa-power", summary="NASA POWER Hourly Solar & Meteorological Data")
async def get_nasa_power_data(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD or YYYYMMDD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD or YYYYMMDD)"),
    time_standard: str = Query(
        "UTC",
        description="Time standard: 'UTC' (default, globally comparable) or 'LST' (Local Solar Time)",
    ),
    client: NasaPowerClient = Depends(get_nasa_power_client),
):
    """
    Fetch NASA POWER solar irradiance and meteorological parameters.
    Explicitly preserves time-standard semantics and grid cell provenance.
    """
    return await client.get_hourly_point(
        latitude=latitude,
        longitude=longitude,
        start_date=start_date,
        end_date=end_date,
        time_standard=time_standard,
    )


@router.get(
    "/observations",
    response_model=PaginatedResponse[EnvironmentalObservationSchema],
    summary="List Observations (PostGIS Database)",
)
async def list_observations(
    parameter_id: Optional[str] = Query(None, description="Filter by parameter ID"),
    parameter: Optional[str] = Query(None, description="Alias for parameter_id"),
    provider_id: Optional[str] = Query(None, description="Filter by provider ID"),
    provider: Optional[str] = Query(None, description="Alias for provider_id"),
    modality: Optional[ObservationModality] = Query(None, description="Filter by modality"),
    quality_status: Optional[QualityStatus] = Query(None, description="Filter by quality status"),
    start: Optional[str] = Query(None, description="Start timestamp filter (ISO 8601 or YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End timestamp filter (ISO 8601 or YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    offset: Optional[int] = Query(None, ge=0),
    repo: ObservationRepository = Depends(get_observation_repo),
):
    """
    Retrieve stored environmental observations from PostgreSQL with spatial coordinates,
    provenance dimensions, and parameter/time filtering.
    """
    param_filter = parameter or parameter_id
    prov_filter = provider or provider_id

    # Parse optional start/end filters
    start_dt = None
    end_dt = None
    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        except Exception:
            pass
    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        except Exception:
            pass

    items, total = await repo.list_observations(
        parameter_id=param_filter,
        provider_id=prov_filter,
        modality=modality,
        quality_status=quality_status,
        start_time=start_dt,
        end_time=end_dt,
        page=page,
        limit=limit,
        offset=offset,
    )

    schema_items = [
        EnvironmentalObservationSchema(
            id=item.id,
            provider_id=item.provider_id,
            dataset_id=item.dataset_id,
            model=item.model,
            parameter_id=item.parameter_id,
            parameter_name=item.parameter_name,
            value=item.value,
            unit=item.unit,
            timestamp_utc=item.timestamp_utc,
            retrieval_timestamp=item.retrieval_timestamp,
            time_standard=item.time_standard or "UTC",
            modality=item.modality,
            quality_status=item.quality_status,
            requested_coordinates=GeoCoordinates(
                latitude=item.requested_latitude,
                longitude=item.requested_longitude,
            ),
            source_coordinates=GeoCoordinates(
                latitude=item.source_latitude,
                longitude=item.source_longitude,
                elevation=item.source_elevation,
            ),
            coordinate_delta_km=item.coordinate_delta_km,
            location_name=item.location_name,
            station_id=item.station_id,
            source_attribution=item.source_attribution,
            metadata=item.raw_metadata,
        )
        for item in items
    ]

    effective_page = page if offset is None else (offset // limit) + 1

    return PaginatedResponse(
        items=schema_items,
        total=total,
        page=effective_page,
        limit=limit,
        has_more=(effective_page * limit) < total,
    )


@router.post(
    "/observations",
    status_code=status.HTTP_201_CREATED,
    summary="Record Environmental Observation",
)
async def create_observation(
    payload: ObservationCreate,
    repo: ObservationRepository = Depends(get_observation_repo),
):
    """
    Store an observation with PostGIS spatial point and coordinate separation.
    """
    obs = await repo.create_observation(payload)
    return {
        "id": obs.id,
        "status": "persisted",
        "coordinate_delta_km": obs.coordinate_delta_km,
        "created_at": obs.created_at.isoformat(),
    }


@router.get(
    "/nearby",
    response_model=List[EnvironmentalObservationSchema],
    summary="PostGIS Spatial Nearby Observations (ST_DWithin)",
)
async def get_nearby_observations(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(50.0, ge=0.1, le=1000.0),
    parameter_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    repo: ObservationRepository = Depends(get_observation_repo),
):
    """
    Query observations within geographic radius using PostGIS ST_DWithin spatial index.
    """
    items = await repo.find_nearby_spatial(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        parameter_id=parameter_id,
        limit=limit,
    )

    return [
        EnvironmentalObservationSchema(
            id=item.id,
            provider_id=item.provider_id,
            dataset_id=item.dataset_id,
            model=item.model,
            parameter_id=item.parameter_id,
            parameter_name=item.parameter_name,
            value=item.value,
            unit=item.unit,
            timestamp_utc=item.timestamp_utc,
            retrieval_timestamp=item.retrieval_timestamp,
            time_standard=item.time_standard or "UTC",
            modality=item.modality,
            quality_status=item.quality_status,
            requested_coordinates=GeoCoordinates(
                latitude=item.requested_latitude,
                longitude=item.requested_longitude,
            ),
            source_coordinates=GeoCoordinates(
                latitude=item.source_latitude,
                longitude=item.source_longitude,
                elevation=item.source_elevation,
            ),
            coordinate_delta_km=item.coordinate_delta_km,
            location_name=item.location_name,
            station_id=item.station_id,
            source_attribution=item.source_attribution,
            metadata=item.raw_metadata,
        )
        for item in items
    ]


@router.get(
    "/bbox",
    response_model=List[EnvironmentalObservationSchema],
    summary="PostGIS Spatial Bounding-Box Query (ST_MakeEnvelope)",
)
async def get_observations_in_bbox(
    min_latitude: float = Query(..., ge=-90.0, le=90.0),
    min_longitude: float = Query(..., ge=-180.0, le=180.0),
    max_latitude: float = Query(..., ge=-90.0, le=90.0),
    max_longitude: float = Query(..., ge=-180.0, le=180.0),
    parameter_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    repo: ObservationRepository = Depends(get_observation_repo),
):
    """
    Query observations within bounding box using PostGIS ST_Within spatial index.
    """
    items = await repo.find_within_bbox(
        min_latitude=min_latitude,
        min_longitude=min_longitude,
        max_latitude=max_latitude,
        max_longitude=max_longitude,
        parameter_id=parameter_id,
        limit=limit,
    )
    return [
        EnvironmentalObservationSchema(
            id=item.id,
            provider_id=item.provider_id,
            dataset_id=item.dataset_id,
            model=item.model,
            parameter_id=item.parameter_id,
            parameter_name=item.parameter_name,
            value=item.value,
            unit=item.unit,
            timestamp_utc=item.timestamp_utc,
            retrieval_timestamp=item.retrieval_timestamp,
            time_standard=item.time_standard or "UTC",
            modality=item.modality,
            quality_status=item.quality_status,
            requested_coordinates=GeoCoordinates(
                latitude=item.requested_latitude,
                longitude=item.requested_longitude,
            ),
            source_coordinates=GeoCoordinates(
                latitude=item.source_latitude,
                longitude=item.source_longitude,
                elevation=item.source_elevation,
            ),
            coordinate_delta_km=item.coordinate_delta_km,
            location_name=item.location_name,
            station_id=item.station_id,
            source_attribution=item.source_attribution,
            metadata=item.raw_metadata,
        )
        for item in items
    ]
