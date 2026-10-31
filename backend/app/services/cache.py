import json
import time
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger

_redis_client: Optional[aioredis.Redis] = None
_in_memory_cache: dict[str, tuple[float, str]] = {}
_warned_redis_offline: bool = False


async def get_redis_client() -> Optional[aioredis.Redis]:
    global _redis_client, _warned_redis_offline
    if _redis_client is None and settings.REDIS_URL:
        try:
            client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            await client.ping()
            _redis_client = client
            logger.info("Connected to Redis cache.")
        except Exception as e:
            if not _warned_redis_offline:
                logger.warning(f"Redis is unavailable ({e}). Falling back to memory cache.")
                _warned_redis_offline = True
            _redis_client = None
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
        except Exception:
            pass
        _redis_client = None
        logger.info("Closed Redis connection.")


def namespace_key(namespace: str, *parts: Any) -> str:
    """
    Constructs standardized namespaced cache keys:
    e.g. terravision:weather:52.52:13.41 or terravision:health:openaq
    """
    clean_parts = [str(p).replace(" ", "_").strip(":") for p in parts if str(p)]
    return f"terravision:{namespace}:{':'.join(clean_parts)}"


async def cache_get(key: str) -> Optional[Any]:
    client = await get_redis_client()
    if client is not None:
        try:
            val = await client.get(key)
            if val is not None:
                return json.loads(val)
        except Exception as e:
            logger.debug(f"Redis get failed for key {key}: {e}")

    if key in _in_memory_cache:
        expire_at, data = _in_memory_cache[key]
        if time.time() < expire_at:
            return json.loads(data)
        else:
            del _in_memory_cache[key]

    return None


async def cache_set(key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
    ttl = ttl_seconds if ttl_seconds is not None else settings.REDIS_DEFAULT_TTL
    serialized = json.dumps(value, default=str)

    client = await get_redis_client()
    if client is not None:
        try:
            await client.set(key, serialized, ex=ttl)
            return
        except Exception as e:
            logger.debug(f"Redis set failed for key {key}: {e}")

    if len(_in_memory_cache) > 1000:
        now = time.time()
        expired_keys = [k for k, (exp, _) in _in_memory_cache.items() if exp < now]
        for k in expired_keys:
            del _in_memory_cache[k]
        if len(_in_memory_cache) > 800:
            _in_memory_cache.clear()

    _in_memory_cache[key] = (time.time() + ttl, serialized)


async def check_cache_health() -> dict:
    if not settings.REDIS_URL:
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "REDIS_URL not configured. Operating with in-memory TTL cache.",
            "backend": "memory",
            "cached_entries": len(_in_memory_cache),
        }

    client = await get_redis_client()
    if client is None:
        return {
            "status": "unreachable",
            "connected": False,
            "message": "Redis connection could not be established. Operating with in-memory fallback.",
            "backend": "memory_fallback",
            "cached_entries": len(_in_memory_cache),
        }

    try:
        await client.ping()
        info = await client.info("server")
        return {
            "status": "healthy",
            "connected": True,
            "message": "Redis connected and responsive.",
            "backend": "redis",
            "redis_version": info.get("redis_version", "unknown"),
        }
    except Exception as e:
        return {
            "status": "unreachable",
            "connected": False,
            "message": f"Redis ping failed: {str(e)}",
            "backend": "memory_fallback",
            "cached_entries": len(_in_memory_cache),
        }
