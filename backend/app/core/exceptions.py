from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class EnvironmentalDataException(HTTPException):
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "An environmental data error occurred.",
        headers: Optional[Dict[str, str]] = None,
        context: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.context = context or {}


class ProviderUnavailableException(EnvironmentalDataException):
    def __init__(self, provider_id: str, reason: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Provider '{provider_id}' is temporarily unavailable: {reason}",
            context={"provider_id": provider_id, "reason": reason},
        )


class ProviderNotConfiguredException(EnvironmentalDataException):
    def __init__(self, provider_id: str, missing_keys: list[str]):
        super().__init__(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Provider '{provider_id}' is NOT_CONFIGURED. Required credentials: {', '.join(missing_keys)}",
            context={"provider_id": provider_id, "missing_keys": missing_keys},
        )


class InvalidCoordinatesException(EnvironmentalDataException):
    def __init__(self, latitude: float, longitude: float):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid WGS84 coordinates: latitude={latitude} must be in [-90, 90], longitude={longitude} must be in [-180, 180].",
            context={"latitude": latitude, "longitude": longitude},
        )


class DatabaseUnavailableException(EnvironmentalDataException):
    def __init__(self, message: str = "PostgreSQL/PostGIS database is currently unavailable."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=message,
        )
