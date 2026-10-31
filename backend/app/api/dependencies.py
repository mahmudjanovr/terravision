from typing import AsyncGenerator, Optional
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.repositories.observation_repository import ObservationRepository
from app.services.providers.open_meteo import OpenMeteoClient
from app.services.providers.open_meteo_archive import OpenMeteoArchiveClient
from app.services.providers.nasa_power import NasaPowerClient
from app.services.providers.openaq import OpenAQClient
from app.services.providers.copernicus import CopernicusClient

_open_meteo_client = OpenMeteoClient()
_archive_client = OpenMeteoArchiveClient()
_nasa_power_client = NasaPowerClient()
_openaq_client = OpenAQClient()
_copernicus_client = CopernicusClient()


def get_open_meteo_client() -> OpenMeteoClient:
    return _open_meteo_client


def get_archive_client() -> OpenMeteoArchiveClient:
    return _archive_client


def get_nasa_power_client() -> NasaPowerClient:
    return _nasa_power_client


def get_openaq_client() -> OpenAQClient:
    return _openaq_client


def get_copernicus_client() -> CopernicusClient:
    return _copernicus_client


def get_observation_repo(
    session: Optional[AsyncSession] = Depends(get_db),
) -> ObservationRepository:
    return ObservationRepository(session)
