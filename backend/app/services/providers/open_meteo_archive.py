from datetime import datetime, timezone
from typing import Any, Dict, List
from app.core.config import settings
from app.core.exceptions import ProviderUnavailableException, EnvironmentalDataException
from app.core.logging import logger
from app.schemas.coordinates import calculate_haversine_distance
from app.services.cache import cache_get, cache_set
from app.services.providers.base import BaseProviderClient


class OpenMeteoArchiveClient(BaseProviderClient):
    def __init__(self):
        super().__init__("open-meteo-archive", settings.OPEN_METEO_ARCHIVE_URL)

    async def check_health(self) -> Dict[str, Any]:
        cache_key = "health:provider:open-meteo-archive"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        try:
            async with self.get_http_client() as client:
                resp = await client.get(
                    f"{self.base_url}/archive",
                    params={
                        "latitude": 52.52,
                        "longitude": 13.41,
                        "start_date": "2022-01-01",
                        "end_date": "2022-01-02",
                        "hourly": "temperature_2m",
                    },
                    timeout=6.0,
                )
                status = "OPERATIONAL" if resp.status_code == 200 else "DEGRADED"
                result = {
                    "id": "open-meteo-archive",
                    "name": "Open-Meteo Historical Archive (ERA5 / ERA5-Land)",
                    "status": status,
                    "data_modalities": ["REANALYSIS", "HISTORICAL_REANALYSIS"],
                    "rate_limit": "10,000 req/day",
                    "last_verified": datetime.now(timezone.utc).isoformat(),
                    "attribution": "ECMWF ERA5 / ERA5-Land via Open-Meteo Archive API (Copernicus C3S)",
                }
                await cache_set(cache_key, result, ttl_seconds=180)
                return result
        except Exception as e:
            logger.warning(f"Historical Archive health check failed: {e}")
            return {
                "id": "open-meteo-archive",
                "name": "Open-Meteo Historical Archive (ERA5 / ERA5-Land)",
                "status": "OUTAGE",
                "data_modalities": ["REANALYSIS", "HISTORICAL_REANALYSIS"],
                "rate_limit": "10,000 req/day",
                "last_verified": datetime.now(timezone.utc).isoformat(),
                "attribution": "ECMWF ERA5 / ERA5-Land via Open-Meteo Archive API (Copernicus C3S)",
            }

    async def query_historical_reanalysis(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
        dataset: str = "era5_land",
    ) -> Dict[str, Any]:
        cache_key = f"archive:{dataset}:{round(latitude, 4)}:{round(longitude, 4)}:{start_date}:{end_date}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        try:
            d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            if d_start > d_end:
                raise EnvironmentalDataException(
                    status_code=422,
                    detail=f"start_date ({start_date}) cannot be after end_date ({end_date}).",
                )
            if d_start.year < 1940:
                raise EnvironmentalDataException(
                    status_code=422,
                    detail=f"start_date ({start_date}) must be 1940-01-01 or later.",
                )
        except ValueError as ve:
            raise EnvironmentalDataException(status_code=422, detail=f"Invalid date format (must be YYYY-MM-DD): {ve}")

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": [
                "temperature_2m",
                "relative_humidity_2m",
                "precipitation",
                "surface_pressure",
                "wind_speed_10m",
                "wind_direction_10m",
            ],
            "timezone": "UTC",
        }

        if dataset == "era5_land":
            params["models"] = "era5_land"
            spatial_resolution = "~0.1° (~11 km)"
            dataset_name = "ECMWF ERA5-Land Historical Reanalysis"
        else:
            params["models"] = "era5"
            spatial_resolution = "~0.25° (~25 km)"
            dataset_name = "ECMWF ERA5 Global Reanalysis"

        try:
            async with self.get_http_client() as client:
                resp = await client.get(f"{self.base_url}/archive", params=params, timeout=20.0)
                if resp.status_code != 200:
                    raise ProviderUnavailableException("open-meteo-archive", f"HTTP {resp.status_code}: {resp.text}")
                data = resp.json()

                source_lat = data.get("latitude", latitude)
                source_lon = data.get("longitude", longitude)
                source_elev = data.get("elevation", None)
                delta_km = calculate_haversine_distance(latitude, longitude, source_lat, source_lon)

                hourly = data.get("hourly", {})
                hourly_units = data.get("hourly_units", {})
                times: List[str] = hourly.get("time", [])

                record_count = len(times)
                result = {
                    "provider": "open-meteo-archive",
                    "dataset": dataset_name,
                    "dataset_id": dataset,
                    "spatial_resolution": spatial_resolution,
                    "modality": "HISTORICAL_REANALYSIS",
                    "requested_coordinates": {"latitude": latitude, "longitude": longitude},
                    "source_coordinates": {
                        "latitude": source_lat,
                        "longitude": source_lon,
                        "elevation": source_elev,
                    },
                    "coordinate_delta_km": delta_km,
                    "start_date": start_date,
                    "end_date": end_date,
                    "record_count": record_count,
                    "hourly": hourly,
                    "hourly_units": hourly_units,
                    "attribution": "ECMWF Copernicus Climate Change Service (C3S) via Open-Meteo Archive API",
                }
                await cache_set(cache_key, result, ttl_seconds=3600)
                return result
        except Exception as e:
            if isinstance(e, (EnvironmentalDataException, ProviderUnavailableException)):
                raise
            raise ProviderUnavailableException("open-meteo-archive", str(e))
