import pytest
from app.services.providers.copernicus import CopernicusClient
from app.core.exceptions import ProviderNotConfiguredException


@pytest.mark.asyncio
async def test_copernicus_status_is_not_configured():
    client = CopernicusClient()
    health = await client.check_health()
    assert health["id"] == "copernicus"
    assert health["status"] == "NOT_CONFIGURED"

    # Attempting to request dataset must raise ProviderNotConfiguredException
    with pytest.raises(ProviderNotConfiguredException):
        await client.request_dataset()
