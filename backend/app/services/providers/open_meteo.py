from datetime import datetime, timezone
from typing import Any, Dict, List
from app.core.config import settings
from app.core.exceptions import ProviderUnavailableException
from app.core.logging import logger
from app.schemas.coordinates import calculate_haversine_distance
from app.services.cache import cache_get, cache_set
from app.services.providers.base import BaseProviderClient


class OpenMeteoClient(BaseProviderClient):
    def __init__(self):
        super().__init__("open-meteo", settings.OPEN_METEO_BASE_URL)
        self.air_quality_url = settings.OPEN_METEO_AIR_QUALITY_URL

    async def check_health(self) -> Dict[str, Any]:
        cache_key = "health:provider:open-meteo"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        try:
            async with self.get_http_client() as client:
                resp = await client.get(
                    f"{self.base_url}/forecast",
                    params={"latitude": 0.0, "longitude": 0.0, "current": "temperature_2m"},
                    timeout=5.0,
                )
                status = "OPERATIONAL" if resp.status_code == 200 else "DEGRADED"
                result = {
                    "id": "open-meteo",
                    "name": "Open-Meteo Weather API",
                    "status": status,
                    "data_modalities": ["FORECAST", "MODEL_DERIVED"],
                    "rate_limit": "10,000 req/day (non-commercial free tier)",
                    "last_verified": datetime.now(timezone.utc).isoformat(),
                    "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)",
                }
                await cache_set(cache_key, result, ttl_seconds=120)
                return result
        except Exception as e:
            logger.warning(f"Open-Meteo health check failed: {e}")
            return {
                "id": "open-meteo",
                "name": "Open-Meteo Weather API",
                "status": "OUTAGE",
                "data_modalities": ["FORECAST", "MODEL_DERIVED"],
                "rate_limit": "10,000 req/day",
                "last_verified": datetime.now(timezone.utc).isoformat(),
                "attribution": "Weather data by Open-Meteo.com (CC BY 4.0)",
            }

    async def get_current_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        cache_key = f"weather:current:{round(latitude, 4)}:{round(longitude, 4)}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": [
                "temperature_2m",
                "relative_humidity_2m",
                "wind_speed_10m",
                "wind_direction_10m",
                "surface_pressure",
                "precipitation",
            ],
            "timezone": "UTC",
        }

        try:
            async with self.get_http_client() as client:
                resp = await client.get(f"{self.base_url}/forecast", params=params)
                if resp.status_code != 200:
                    raise ProviderUnavailableException("open-meteo", f"HTTP {resp.status_code}: {resp.text}")
                data = resp.json()

                source_lat = data.get("latitude", latitude)
                source_lon = data.get("longitude", longitude)
                source_elev = data.get("elevation", None)
                delta_km = calculate_haversine_distance(latitude, longitude, source_lat, source_lon)

                current = data.get("current", {})
                current_units = data.get("current_units", {})

                observations: List[Dict[str, Any]] = []
                param_mapping = {
                    "temperature_2m": ("Temperature at 2m", "°C"),
                    "relative_humidity_2m": ("Relative Humidity", "%"),
                    "wind_speed_10m": ("Wind Speed at 10m", "km/h"),
                    "wind_direction_10m": ("Wind Direction", "°"),
                    "surface_pressure": ("Surface Pressure", "hPa"),
                    "precipitation": ("Precipitation", "mm"),
                }

                ts_utc = current.get("time", datetime.now(timezone.utc).isoformat())

                for p_key, (p_name, default_unit) in param_mapping.items():
                    val = current.get(p_key)
                    unit = current_units.get(p_key, default_unit)
                    observations.append({
                        "id": f"om-{p_key}-{ts_utc}",
                        "provider_id": "open-meteo",
                        "dataset_id": "open_meteo_operational",
                        "parameter_id": p_key,
                        "parameter_name": p_name,
                        "value": val,
                        "unit": unit,
                        "timestamp_utc": ts_utc,
                        "modality": "FORECAST",
                        "quality_status": "VALIDATED" if val is not None else "MISSING",
                        "requested_coordinates": {"latitude": latitude, "longitude": longitude},
                        "source_coordinates": {
                            "latitude": source_lat,
                            "longitude": source_lon,
                            "elevation": source_elev,
                        },
                        "coordinate_delta_km": delta_km,
                        "location_name": f"Open-Meteo Grid ({source_lat:.2f}°, {source_lon:.2f}°)",
                        "metadata": {
                            "elevation_m": source_elev,
                            "generationtime_ms": data.get("generationtime_ms"),
                            "utc_offset_seconds": data.get("utc_offset_seconds", 0),
                        },
                    })

                normalized = {
                    "provider": "open-meteo",
                    "requested_coordinates": {"latitude": latitude, "longitude": longitude},
                    "source_coordinates": {
                        "latitude": source_lat,
                        "longitude": source_lon,
                        "elevation": source_elev,
                    },
                    "coordinate_delta_km": delta_km,
                    "generationtime_ms": data.get("generationtime_ms"),
                    "observations": observations,
                }
                await cache_set(cache_key, normalized, ttl_seconds=300)
                return normalized
        except Exception as e:
            if isinstance(e, ProviderUnavailableException):
                raise
            raise ProviderUnavailableException("open-meteo", str(e))

    async def get_air_quality(self, latitude: float, longitude: float) -> Dict[str, Any]:
        cache_key = f"airquality:current:{round(latitude, 4)}:{round(longitude, 4)}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": [
                "pm10",
                "pm2_5",
                "carbon_monoxide",
                "nitrogen_dioxide",
                "sulphur_dioxide",
                "ozone",
            ],
            "timezone": "UTC",
        }

        try:
            async with self.get_http_client() as client:
                resp = await client.get(f"{self.air_quality_url}/air-quality", params=params)
                if resp.status_code != 200:
                    raise ProviderUnavailableException("open-meteo-aq", f"HTTP {resp.status_code}: {resp.text}")
                data = resp.json()

                source_lat = data.get("latitude", latitude)
                source_lon = data.get("longitude", longitude)
                source_elev = data.get("elevation", None)
                delta_km = calculate_haversine_distance(latitude, longitude, source_lat, source_lon)

                current = data.get("current", {})
                current_units = data.get("current_units", {})
                ts_utc = current.get("time", datetime.now(timezone.utc).isoformat())

                param_mapping = {
                    "pm2_5": ("Particulate Matter PM2.5", "µg/m³"),
                    "pm10": ("Particulate Matter PM10", "µg/m³"),
                    "nitrogen_dioxide": ("Nitrogen Dioxide (NO2)", "µg/m³"),
                    "ozone": ("Ozone (O3)", "µg/m³"),
                    "sulphur_dioxide": ("Sulphur Dioxide (SO2)", "µg/m³"),
                    "carbon_monoxide": ("Carbon Monoxide (CO)", "µg/m³"),
                }

                observations: List[Dict[str, Any]] = []
                for p_key, (p_name, default_unit) in param_mapping.items():
                    val = current.get(p_key)
                    unit = current_units.get(p_key, default_unit)
                    observations.append({
                        "id": f"omaq-{p_key}-{ts_utc}",
                        "provider_id": "open-meteo-aq",
                        "dataset_id": "cams_european_air_quality",
                        "parameter_id": p_key,
                        "parameter_name": p_name,
                        "value": val,
                        "unit": unit,
                        "timestamp_utc": ts_utc,
                        "modality": "MODEL_DERIVED",
                        "quality_status": "VALIDATED" if val is not None else "MISSING",
                        "requested_coordinates": {"latitude": latitude, "longitude": longitude},
                        "source_coordinates": {
                            "latitude": source_lat,
                            "longitude": source_lon,
                            "elevation": source_elev,
                        },
                        "coordinate_delta_km": delta_km,
                        "location_name": f"CAMS Grid Point ({source_lat:.2f}°, {source_lon:.2f}°)",
                        "metadata": {
                            "model": "CAMS / ECMWF atmospheric composition",
                            "elevation_m": source_elev,
                        },
                    })

                normalized = {
                    "provider": "open-meteo-aq",
                    "requested_coordinates": {"latitude": latitude, "longitude": longitude},
                    "source_coordinates": {
                        "latitude": source_lat,
                        "longitude": source_lon,
                        "elevation": source_elev,
                    },
                    "coordinate_delta_km": delta_km,
                    "observations": observations,
                }
                await cache_set(cache_key, normalized, ttl_seconds=300)
                return normalized
        except Exception as e:
            if isinstance(e, ProviderUnavailableException):
                raise
            raise ProviderUnavailableException("open-meteo-aq", str(e))
