from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import ObservationModality, QualityStatus
from app.schemas.coordinates import GeoCoordinates


class EnvironmentalObservationSchema(BaseModel):
    id: str
    provider_id: str
    dataset_id: str
    model: Optional[str] = None
    parameter_id: str
    parameter_name: str
    value: Optional[float] = None
    unit: str
    timestamp_utc: datetime
    retrieval_timestamp: Optional[datetime] = None
    time_standard: str = "UTC"
    modality: ObservationModality
    quality_status: QualityStatus
    
    requested_coordinates: GeoCoordinates
    source_coordinates: GeoCoordinates
    coordinate_delta_km: Optional[float] = None
    
    location_name: Optional[str] = None
    station_id: Optional[str] = None
    source_attribution: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class ObservationCreate(BaseModel):
    provider_id: str
    dataset_id: str
    model: Optional[str] = None
    parameter_id: str
    parameter_name: str
    value: Optional[float] = None
    unit: str
    timestamp_utc: datetime
    time_standard: str = "UTC"
    modality: ObservationModality
    quality_status: QualityStatus = QualityStatus.UNVERIFIED
    
    requested_latitude: float
    requested_longitude: float
    source_latitude: float
    source_longitude: float
    source_elevation: Optional[float] = None
    
    location_name: Optional[str] = None
    station_id: Optional[str] = None
    source_attribution: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class NearbyObservationsQuery(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_km: float = Field(default=50.0, ge=0.1, le=1000.0)
    parameter_id: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=500)
