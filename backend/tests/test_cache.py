import asyncio
import pytest
from app.services.cache import cache_get, cache_set, check_cache_health


@pytest.mark.asyncio
async def test_in_memory_cache_set_and_get():
    await cache_set("test_key_1", {"metric": "temperature", "val": 22.5}, ttl_seconds=60)
    cached = await cache_get("test_key_1")
    assert cached is not None
    assert cached["metric"] == "temperature"
    assert cached["val"] == 22.5


@pytest.mark.asyncio
async def test_cache_health_check():
    health = await check_cache_health()
    assert "status" in health
    assert "backend" in health
    assert health["status"] in ["healthy", "unconfigured", "unreachable"]
