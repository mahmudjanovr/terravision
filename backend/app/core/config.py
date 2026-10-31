from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "TERRAVISION Environmental Intelligence API"
    VERSION: str = "0.3.1"
    DESCRIPTION: str = (
        "Global-first Environmental Intelligence Platform API with PostGIS spatial "
        "indexing, Redis caching, and real-world provider integrations."
    )
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="Async PostgreSQL connection string",
    )
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Redis connection string",
    )
    REDIS_DEFAULT_TTL: int = 300

    OPENAQ_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAQ API v3 Key",
    )
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    OPEN_METEO_ARCHIVE_URL: str = "https://archive-api.open-meteo.com/v1"
    OPEN_METEO_AIR_QUALITY_URL: str = "https://air-quality-api.open-meteo.com/v1"
    OPENAQ_BASE_URL: str = "https://api.openaq.org/v3"
    NASA_POWER_BASE_URL: str = "https://power.larc.nasa.gov/api/temporal/hourly/point"

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
