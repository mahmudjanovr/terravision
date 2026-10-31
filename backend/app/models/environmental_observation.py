import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Enum, Index, JSON
from geoalchemy2 import Geometry
from app.db.base import Base


class ObservationModality(str, enum.Enum):
    GROUND_OBSERVATION = "GROUND_OBSERVATION"
    OBSERVATION = "OBSERVATION"  # Compatibility alias for ground observation
    MODEL_DERIVED = "MODEL_DERIVED"
    SATELLITE_OBSERVATION = "SATELLITE_OBSERVATION"
    REANALYSIS = "REANALYSIS"
    HISTORICAL_REANALYSIS = "HISTORICAL_REANALYSIS"
    FORECAST = "FORECAST"


class QualityStatus(str, enum.Enum):
    VALIDATED = "VALIDATED"
    UNVERIFIED = "UNVERIFIED"
    SUSPECT = "SUSPECT"
    MISSING = "MISSING"
    INVALID = "INVALID"


class EnvironmentalObservation(Base):
    __tablename__ = "environmental_observations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_id = Column(String(64), nullable=False, index=True)
    dataset_id = Column(String(64), nullable=False, index=True)
    model = Column(String(64), nullable=True, index=True)  # e.g., "ERA5", "ERA5-Land", "MERRA-2", "CAMS", "IFS"
    parameter_id = Column(String(64), nullable=False, index=True)
    parameter_name = Column(String(128), nullable=False)
    
    value = Column(Float, nullable=True)
    unit = Column(String(32), nullable=False)
    timestamp_utc = Column(DateTime(timezone=True), nullable=False, index=True)
    retrieval_timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    time_standard = Column(String(16), nullable=False, default="UTC")  # "UTC" or "LST"

    modality = Column(
        Enum(ObservationModality, name="modality_enum", native_enum=False),
        nullable=False,
        default=ObservationModality.GROUND_OBSERVATION,
        index=True,
    )
    quality_status = Column(
        Enum(QualityStatus, name="quality_status_enum", native_enum=False),
        nullable=False,
        default=QualityStatus.UNVERIFIED,
        index=True,
    )

    # Explicit scientific coordinate provenance
    requested_latitude = Column(Float, nullable=False)
    requested_longitude = Column(Float, nullable=False)
    source_latitude = Column(Float, nullable=False)
    source_longitude = Column(Float, nullable=False)
    source_elevation = Column(Float, nullable=True)
    coordinate_delta_km = Column(Float, nullable=True)

    location_name = Column(String(256), nullable=True)
    station_id = Column(String(128), nullable=True, index=True)
    source_attribution = Column(String(256), nullable=True)

    # PostGIS Spatial POINT (SRID 4326)
    spatial_point = Column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=True,
    )

    raw_metadata = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_obs_param_time", "parameter_id", "timestamp_utc"),
        Index("ix_obs_provider_time", "provider_id", "timestamp_utc"),
        Index("ix_obs_requested_coords", "requested_latitude", "requested_longitude"),
    )


class EnvironmentalRegion(Base):
    """
    Geographic bounding polygons and multi-polygons for regional analysis,
    air sheds, protected ecological zones, and administrative boundaries.
    """
    __tablename__ = "environmental_regions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False, index=True)
    region_type = Column(String(64), nullable=False, index=True)  # "BIOME", "PROTECTED_AREA", "AIR_SHED", "MONITORING_GRID"
    description = Column(String(512), nullable=True)
    
    # PostGIS Polygon and MultiPolygon geometries in WGS84 (SRID 4326)
    boundary_polygon = Column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True),
        nullable=True,
    )
    boundary_multipolygon = Column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=True),
        nullable=True,
    )

    raw_metadata = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
