from typing import List
from pydantic import BaseModel, Field


class DataSourceMetadata(BaseModel):
    id: str
    name: str
    category: str
    spatial_coverage: str
    spatial_resolution: str
    temporal_coverage: str
    temporal_resolution: str
    data_modality: str
    access_tier: str
    latency: str
    status: str
    attribution: str
    doc_url: str
    supported_parameters: List[str]


class HistoricalQueryRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    dataset: str = Field(default="era5_land", description="era5 or era5_land")


class WeatherCurrentQuery(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class AirQualityQuery(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
