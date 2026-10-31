import math
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class GeoCoordinates(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    elevation: Optional[float] = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError(f"Latitude {v} must be between -90 and 90 degrees.")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError(f"Longitude {v} must be between -180 and 180 degrees.")
        return round(v, 6)


class CoordinateProvenance(BaseModel):
    requested: GeoCoordinates
    source: GeoCoordinates
    delta_km: float = Field(..., ge=0.0)
    elevation_delta_m: Optional[float] = None


class BoundingBox(BaseModel):
    min_latitude: float = Field(..., ge=-90.0, le=90.0)
    max_latitude: float = Field(..., ge=-90.0, le=90.0)
    min_longitude: float = Field(..., ge=-180.0, le=180.0)
    max_longitude: float = Field(..., ge=-180.0, le=180.0)

    @field_validator("max_latitude")
    @classmethod
    def validate_lat_range(cls, v: float, info) -> float:
        min_lat = info.data.get("min_latitude")
        if min_lat is not None and v < min_lat:
            raise ValueError(f"max_latitude ({v}) must be greater than or equal to min_latitude ({min_lat}).")
        return v


def calculate_haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 3)
