from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.exceptions import ProviderUnavailableException, EnvironmentalDataException
from app.core.logging import logger
from app.schemas.coordinates import calculate_haversine_distance
from app.services.cache import cache_get, cache_set
from app.services.providers.base import BaseProviderClient


class NasaPowerClient(BaseProviderClient):
    """Client for NASA POWER Solar Radiation and Meteorology API."""

    def __init__(self):
        super().__init__("nasa-power", settings.NASA_POWER_BASE_URL, timeout_seconds=20.0)

    async def check_health(self) -> Dict[str, Any]:
        cache_key = "health:provider:nasa-power"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        try:
            # Test health with 1-day query
            async with self.get_http_client() as client:
                params = {
                    "parameters": "T2M",
                    "community": "RE",
                    "longitude": 0.0,
                    "latitude": 0.0,
                    "start": "20230101",
                    "end": "20230101",
                    "format": "JSON",
                    "time-standard": "UTC",
                }
                resp = await client.get(self.base_url, params=params, timeout=8.0)
                status = "OPERATIONAL" if resp.status_code == 200 else "DEGRADED"
                result = {
                    "id": "nasa-power",
                    "name": "NASA POWER (Prediction of Worldwide Energy Resources)",
                    "status": status,
                    "data_modalities": ["MODEL_DERIVED", "REANALYSIS"],
                    "rate_limit": "30 req/min (standard public access)",
                    "last_verified": datetime.now(timezone.utc).isoformat(),
                    "attribution": "NASA Langley Research Center POWER Project / MERRA-2 / GEOS",
                }
                await cache_set(cache_key, result, ttl_seconds=180)
                return result
        except Exception as e:
            logger.warning(f"NASA POWER health check failed: {e}")
            return {
                "id": "nasa-power",
                "name": "NASA POWER",
                "status": "OUTAGE",
                "data_modalities": ["MODEL_DERIVED", "REANALYSIS"],
                "rate_limit": "30 req/min",
                "last_verified": datetime.now(timezone.utc).isoformat(),
                "attribution": "NASA Langley Research Center POWER Project",
            }

    async def get_hourly_point(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
        time_standard: str = "UTC",
    ) -> Dict[str, Any]:
        """
        Query NASA POWER hourly point data.
        time_standard: 'UTC' or 'LST' (Local Solar Time).
        Dates must be YYYYMMDD.
        """
        std = time_standard.upper()
        if std not in ["UTC", "LST"]:
            raise EnvironmentalDataException(
                status_code=422,
                detail=f"Invalid time_standard '{time_standard}'. Must be 'UTC' or 'LST'.",
            )

        clean_start = start_date.replace("-", "")
        clean_end = end_date.replace("-", "")
        cache_key = f"nasapower:{clean_start}:{clean_end}:{round(latitude, 4)}:{round(longitude, 4)}:{std}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        params = {
            "parameters": "ALLSKY_SFC_SW_DWN,T2M,RH2M,WS10M,PRECTOTCORR",
            "community": "RE",
            "longitude": longitude,
            "latitude": latitude,
            "start": clean_start,
            "end": clean_end,
            "format": "JSON",
            "time-standard": std,
        }

        try:
            async with self.get_http_client() as client:
                resp = await client.get(self.base_url, params=params)
                if resp.status_code != 200:
                    raise ProviderUnavailableException("nasa-power", f"HTTP {resp.status_code}: {resp.text[:200]}")
                data = resp.json()

                geometry = data.get("geometry", {}).get("coordinates", [longitude, latitude, 0])
                source_lon = geometry[0] if len(geometry) > 0 else longitude
                source_lat = geometry[1] if len(geometry) > 1 else latitude
                source_elev = geometry[2] if len(geometry) > 2 else None
                delta_km = calculate_haversine_distance(latitude, longitude, source_lat, source_lon)

                properties = data.get("properties", {})
                parameter_data = properties.get("parameter", {})
                param_meta = data.get("parameters", {})

                result = {
                    "provider": "nasa-power",
                    "time_standard": std,
                    "requested_coordinates": {"latitude": latitude, "longitude": longitude},
                    "source_coordinates": {
                        "latitude": source_lat,
                        "longitude": source_lon,
                        "elevation": source_elev,
                    },
                    "coordinate_delta_km": delta_km,
                    "start_date": clean_start,
                    "end_date": clean_end,
                    "parameters": parameter_data,
                    "metadata": param_meta,
                    "attribution": "NASA Langley Research Center POWER Project",
                }
                await cache_set(cache_key, result, ttl_seconds=3600)
                return result
        except Exception as e:
            if isinstance(e, (EnvironmentalDataException, ProviderUnavailableException)):
                raise
            raise ProviderUnavailableException("nasa-power", str(e))
