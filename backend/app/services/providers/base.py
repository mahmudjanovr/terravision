from abc import ABC, abstractmethod
from typing import Any, Dict
import httpx


class BaseProviderClient(ABC):
    def __init__(self, provider_id: str, base_url: str, timeout_seconds: float = 12.0):
        self.provider_id = provider_id
        self.base_url = base_url
        self.timeout = timeout_seconds

    def get_http_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout, connect=5.0),
            headers={"User-Agent": "TERRAVISION-Platform/0.3.1 (Environmental Intelligence)"},
        )

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        pass
