from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.exceptions import ProviderUnavailableException
from app.core.logging import logger
from app.schemas.coordinates import calculate_haversine_distance
from app.services.cache import cache_get, cache_set
from app.services.providers.base import BaseProviderClient


class OpenAQClient(BaseProviderClient):
    """Client for OpenAQ API v3 physical monitoring stations."""

    def __init__(self):
        super().__init__("openaq", settings.OPENAQ_BASE_URL)

    def _get_headers(self) -> Dict[str, str]:
        headers = {"User-Agent": "TERRAVISION-Platform/0.3.1 (Environmental Intelligence)"}
        if settings.OPENAQ_API_KEY:
            headers["X-API-Key"] = settings.OPENAQ_API_KEY
        return headers

    async def check_health(self) -> Dict[str, Any]:
        cache_key = "health:provider:openaq"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient(headers=self._get_headers(), timeout=6.0) as client:
                resp = await client.get(f"{self.base_url}/locations", params={"limit": 1})
                if resp.status_code == 200:
                    status = "OPERATIONAL"
                elif resp.status_code in [401, 403]:
                    status = "UNAUTHORIZED_KEY_REQUIRED"
                else:
                    status = "DEGRADED"

                result = {
                    "id": "openaq",
                    "name": "OpenAQ API v3 (Global Air Quality Monitoring Stations)",
                    "status": status,
                    "data_modalities": ["OBSERVATION"],
                    "rate_limit": "Rate limited per API key tier",
                    "last_verified": datetime.now(timezone.utc).isoformat(),
                    "has_server_key": bool(settings.OPENAQ_API_KEY),
                    "attribution": "OpenAQ Community / OpenAQ API v3 (CC BY 4.0)",
                }
                await cache_set(cache_key, result, ttl_seconds=120)
                return result
        except Exception as e:
            logger.warning(f"OpenAQ health check failed: {e}")
            return {
                "id": "openaq",
                "name": "OpenAQ API v3",
                "status": "OUTAGE",
                "data_modalities": ["OBSERVATION"],
                "rate_limit": "API key dependent",
                "last_verified": datetime.now(timezone.utc).isoformat(),
                "has_server_key": bool(settings.OPENAQ_API_KEY),
                "attribution": "OpenAQ Community (CC BY 4.0)",
            }

    async def get_nearby_locations(
        self, latitude: float, longitude: float, radius_meters: int = 25000, limit: int = 10
    ) -> Dict[str, Any]:
        """Fetch physical monitoring stations within radius."""
        cache_key = f"openaq:locations:{round(latitude, 4)}:{round(longitude, 4)}:{radius_meters}:{limit}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        params = {
            "coordinates": f"{latitude},{longitude}",
            "radius": radius_meters,
            "limit": limit,
        }

        try:
            async with httpx.AsyncClient(headers=self._get_headers(), timeout=12.0) as client:
                resp = await client.get(f"{self.base_url}/locations", params=params)
                if resp.status_code != 200:
                    raise ProviderUnavailableException("openaq", f"HTTP {resp.status_code}: {resp.text[:200]}")
                data = resp.json()
                results = data.get("results", [])

                stations = []
                for item in results:
                    coords = item.get("coordinates", {})
                    st_lat = coords.get("latitude")
                    st_lon = coords.get("longitude")
                    delta_km = (
                        calculate_haversine_distance(latitude, longitude, st_lat, st_lon)
                        if st_lat is not None and st_lon is not None
                        else None
                    )
                    stations.append({
                        "station_id": str(item.get("id")),
                        "name": item.get("name"),
                        "locality": item.get("locality"),
                        "country": item.get("country", {}).get("name") if isinstance(item.get("country"), dict) else item.get("country"),
                        "coordinates": {"latitude": st_lat, "longitude": st_lon},
                        "distance_km": delta_km,
                        "sensors": item.get("sensors", []),
                        "is_monitor": item.get("isMonitor", True),
                    })

                normalized = {
                    "provider": "openaq",
                    "requested_coordinates": {"latitude": latitude, "longitude": longitude},
                    "radius_meters": radius_meters,
                    "count": len(stations),
                    "stations": stations,
                    "attribution": "Data provided by OpenAQ (openaq.org)",
                }
                await cache_set(cache_key, normalized, ttl_seconds=300)
                return normalized
        except Exception as e:
            if isinstance(e, ProviderUnavailableException):
                raise
            raise ProviderUnavailableException("openaq", str(e))
