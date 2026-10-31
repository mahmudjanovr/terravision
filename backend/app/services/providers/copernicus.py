from datetime import datetime, timezone
from typing import Any, Dict
from app.core.exceptions import ProviderNotConfiguredException
from app.services.providers.base import BaseProviderClient


class CopernicusClient(BaseProviderClient):
    """
    Copernicus Climate Data Store (CDS) Client.
    Truthfully classified as NOT_CONFIGURED until CDS credentials are provided.
    """

    def __init__(self):
        super().__init__("copernicus", "https://cds.climate.copernicus.eu/api/v2")

    async def check_health(self) -> Dict[str, Any]:
        return {
            "id": "copernicus",
            "name": "Copernicus Climate Data Store (CDS API)",
            "status": "NOT_CONFIGURED",
            "data_modalities": ["REANALYSIS"],
            "rate_limit": "Queued batch processing",
            "last_verified": datetime.now(timezone.utc).isoformat(),
            "attribution": "European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus C3S",
            "notes": (
                "Direct ECMWF CDS API requires authenticated CDS UID and API key. "
                "Historical ERA5 / ERA5-Land reanalysis is currently served via Open-Meteo Historical Archive API."
            ),
        }

    async def request_dataset(self, *args, **kwargs):
        raise ProviderNotConfiguredException(
            provider_id="copernicus",
            missing_keys=["CDS_UID", "CDS_API_KEY"],
        )
