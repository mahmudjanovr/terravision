from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_archive_client
from app.services.providers.open_meteo_archive import OpenMeteoArchiveClient

router = APIRouter(prefix="/climate", tags=["Climate & Historical Reanalysis"])


@router.get("/historical", summary="Query Historical Reanalysis (ERA5 / ERA5-Land)")
async def get_historical_climate(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format (1940-01-01 onwards)"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    dataset: str = Query(
        "era5_land",
        description="Reanalysis model: 'era5_land' (~0.1° / ~11 km) or 'era5' (~0.25° / ~25 km)",
    ),
    client: OpenMeteoArchiveClient = Depends(get_archive_client),
):
    """
    Fetch ECMWF ERA5 or ERA5-Land reanalysis from Copernicus C3S archive.
    Explicitly classified as HISTORICAL_REANALYSIS modality.
    """
    return await client.query_historical_reanalysis(
        latitude=latitude,
        longitude=longitude,
        start_date=start_date,
        end_date=end_date,
        dataset=dataset,
    )
