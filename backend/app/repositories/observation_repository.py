import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_, desc, text
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID, ST_GeogFromWKB
from app.models.environmental_observation import (
    EnvironmentalObservation,
    ObservationModality,
    QualityStatus,
)
from app.schemas.coordinates import calculate_haversine_distance
from app.schemas.observation import ObservationCreate


class ObservationRepository:
    """Repository handling CRUD and PostGIS spatial queries for Environmental Observations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_observation(self, data: ObservationCreate) -> EnvironmentalObservation:
        delta_km = calculate_haversine_distance(
            data.requested_latitude,
            data.requested_longitude,
            data.source_latitude,
            data.source_longitude,
        )

        obs = EnvironmentalObservation(
            id=str(uuid.uuid4()),
            provider_id=data.provider_id,
            dataset_id=data.dataset_id,
            model=data.model,
            parameter_id=data.parameter_id,
            parameter_name=data.parameter_name,
            value=data.value,
            unit=data.unit,
            timestamp_utc=data.timestamp_utc,
            retrieval_timestamp=datetime.now(timezone.utc),
            time_standard=data.time_standard or "UTC",
            modality=data.modality,
            quality_status=data.quality_status,
            requested_latitude=data.requested_latitude,
            requested_longitude=data.requested_longitude,
            source_latitude=data.source_latitude,
            source_longitude=data.source_longitude,
            source_elevation=data.source_elevation,
            coordinate_delta_km=delta_km,
            location_name=data.location_name,
            station_id=data.station_id,
            source_attribution=data.source_attribution,
            raw_metadata=data.metadata,
            created_at=datetime.now(timezone.utc),
            # PostGIS Point(lon, lat) WGS84
            spatial_point=func.ST_SetSRID(
                func.ST_MakePoint(data.source_longitude, data.source_latitude), 4326
            ),
        )
        self.session.add(obs)
        await self.session.flush()
        return obs

    async def get_by_id(self, obs_id: str) -> Optional[EnvironmentalObservation]:
        stmt = select(EnvironmentalObservation).where(EnvironmentalObservation.id == obs_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_observations(
        self,
        parameter_id: Optional[str] = None,
        provider_id: Optional[str] = None,
        modality: Optional[ObservationModality] = None,
        quality_status: Optional[QualityStatus] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page: int = 1,
        limit: int = 50,
        offset: Optional[int] = None,
    ) -> Tuple[List[EnvironmentalObservation], int]:
        filters = []
        if parameter_id:
            filters.append(EnvironmentalObservation.parameter_id == parameter_id)
        if provider_id:
            filters.append(EnvironmentalObservation.provider_id == provider_id)
        if modality:
            filters.append(EnvironmentalObservation.modality == modality)
        if quality_status:
            filters.append(EnvironmentalObservation.quality_status == quality_status)
        if start_time:
            filters.append(EnvironmentalObservation.timestamp_utc >= start_time)
        if end_time:
            filters.append(EnvironmentalObservation.timestamp_utc <= end_time)

        count_stmt = select(func.count(EnvironmentalObservation.id))
        if filters:
            count_stmt = count_stmt.where(and_(*filters))
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = select(EnvironmentalObservation)
        if filters:
            stmt = stmt.where(and_(*filters))
        stmt = stmt.order_by(desc(EnvironmentalObservation.timestamp_utc))
        actual_offset = offset if offset is not None else (page - 1) * limit
        stmt = stmt.offset(actual_offset).limit(limit)

        res = await self.session.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def find_nearby_spatial(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0,
        parameter_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[EnvironmentalObservation]:
        """
        Executes PostGIS ST_DWithin spatial query using geography casting for meters.
        """
        radius_meters = radius_km * 1000.0
        center_geom = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)

        stmt = select(EnvironmentalObservation).where(
            func.ST_DWithin(
                func.cast(EnvironmentalObservation.spatial_point, text("geography")),
                func.cast(center_geom, text("geography")),
                radius_meters,
            )
        )
        if parameter_id:
            stmt = stmt.where(EnvironmentalObservation.parameter_id == parameter_id)

        stmt = stmt.order_by(desc(EnvironmentalObservation.timestamp_utc)).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def find_within_bbox(
        self,
        min_latitude: float,
        min_longitude: float,
        max_latitude: float,
        max_longitude: float,
        parameter_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[EnvironmentalObservation]:
        """
        Executes PostGIS bounding-box filtering with ST_MakeEnvelope.
        """
        envelope = func.ST_MakeEnvelope(
            min_longitude, min_latitude, max_longitude, max_latitude, 4326
        )
        stmt = select(EnvironmentalObservation).where(
            func.ST_Within(EnvironmentalObservation.spatial_point, envelope)
        )
        if parameter_id:
            stmt = stmt.where(EnvironmentalObservation.parameter_id == parameter_id)

        stmt = stmt.order_by(desc(EnvironmentalObservation.timestamp_utc)).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def find_within_polygon(
        self,
        polygon_wkt: str,
        parameter_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[EnvironmentalObservation]:
        """
        Executes PostGIS ST_Contains polygon or multipolygon spatial filtering.
        """
        poly_geom = func.ST_GeomFromText(polygon_wkt, 4326)
        stmt = select(EnvironmentalObservation).where(
            func.ST_Contains(poly_geom, EnvironmentalObservation.spatial_point)
        )
        if parameter_id:
            stmt = stmt.where(EnvironmentalObservation.parameter_id == parameter_id)

        stmt = stmt.order_by(desc(EnvironmentalObservation.timestamp_utc)).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
