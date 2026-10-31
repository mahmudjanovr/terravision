import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "TERRAVISION"
    assert "version" in data
    assert "endpoints" in data


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "cache" in data
    assert "providers" in data


@pytest.mark.asyncio
async def test_data_sources_catalog(client: AsyncClient):
    response = await client.get("/api/v1/data-sources")
    assert response.status_code == 200
    sources = response.json()
    assert len(sources) >= 5

    source_ids = {s["id"] for s in sources}
    assert "open-meteo" in source_ids
    assert "open-meteo-archive" in source_ids
    assert "nasa-power" in source_ids
    assert "openaq" in source_ids
    assert "copernicus-cds" in source_ids

    # Verify Copernicus is NOT_CONFIGURED
    copernicus = next(s for s in sources if s["id"] == "copernicus-cds")
    assert copernicus["status"] == "NOT_CONFIGURED"

    # Verify ERA5 vs ERA5-Land spatial resolution documentation
    archive = next(s for s in sources if s["id"] == "open-meteo-archive")
    assert "0.25°" in archive["spatial_resolution"]
    assert "0.1°" in archive["spatial_resolution"]


@pytest.mark.asyncio
async def test_coordinate_validation_rejection(client: AsyncClient):
    # Latitude > 90 must return 422 Unprocessable Entity
    resp = await client.get("/api/v1/environmental/weather/current?latitude=99.9&longitude=0.0")
    assert resp.status_code == 422

    # Longitude < -180 must return 422 Unprocessable Entity
    resp_lon = await client.get("/api/v1/environmental/weather/current?latitude=0.0&longitude=-181.0")
    assert resp_lon.status_code == 422


@pytest.mark.asyncio
async def test_providers_health_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/health/providers")
    assert response.status_code == 200
    data = response.json()
    assert "open-meteo" in data
    assert "nasa-power" in data
    assert "openaq" in data
    assert "copernicus" in data
    assert data["copernicus"]["status"] == "NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_db_health_graceful_handling(client: AsyncClient):
    response = await client.get("/api/v1/health/db")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    # When DATABASE_URL is not set, status is unconfigured without crashing
    assert data["status"] in ["unconfigured", "unreachable", "healthy"]


@pytest.mark.asyncio
async def test_cache_health_graceful_handling(client: AsyncClient):
    response = await client.get("/api/v1/health/cache")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["unconfigured", "healthy", "unreachable"]


@pytest.mark.asyncio
async def test_database_observations_empty_or_unavailable(client: AsyncClient):
    # When DB is unconfigured, requesting /observations returns 503 Service Unavailable gracefully
    # rather than an unhandled 500 error
    response = await client.get("/api/v1/environmental/observations?page=1&limit=10")
    assert response.status_code in [200, 503]
    if response.status_code == 200:
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
    elif response.status_code == 503:
        err = response.json()
        assert "detail" in err


@pytest.mark.asyncio
async def test_air_quality_endpoint(client: AsyncClient):
    # Tests that /api/v1/air-quality is accessible
    response = await client.get("/api/v1/air-quality?latitude=52.52&longitude=13.40")
    assert response.status_code in [200, 503]
    if response.status_code == 200:
        data = response.json()
        assert "provider" in data
        assert "observations" in data


@pytest.mark.asyncio
async def test_nasa_power_invalid_time_standard(client: AsyncClient):
    # Must reject invalid time-standard (only UTC or LST allowed)
    response = await client.get(
        "/api/v1/environmental/nasa-power?latitude=40.0&longitude=-74.0&start_date=20230101&end_date=20230102&time_standard=INVALID_TZ"
    )
    assert response.status_code == 422
