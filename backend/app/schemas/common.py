import enum
from typing import Generic, List, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


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


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1)
    has_more: bool
