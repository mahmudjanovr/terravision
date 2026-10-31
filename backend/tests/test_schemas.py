from datetime import datetime, timezone
from app.models.environmental_observation import ObservationModality, QualityStatus
from app.schemas.observation import (
    EnvironmentalObservationSchema,
    ObservationCreate,
)
from app.schemas.coordinates import GeoCoordinates


def test_observation_schema_coordinate_separation():
    req_coords = GeoCoordinates(latitude=52.5200, longitude=13.4050)
    src_coords = GeoCoordinates(latitude=52.5000, longitude=13.4167, elevation=45.0)

    obs = EnvironmentalObservationSchema(
        id="test-obs-1",
        provider_id="open-meteo",
        dataset_id="open_meteo_operational",
        parameter_id="temperature_2m",
        parameter_name="Temperature at 2m",
        value=18.4,
        unit="°C",
        timestamp_utc=datetime.now(timezone.utc),
        modality=ObservationModality.FORECAST,
        quality_status=QualityStatus.VALIDATED,
        requested_coordinates=req_coords,
        source_coordinates=src_coords,
        coordinate_delta_km=2.35,
        location_name="Berlin Model Grid",
    )

    # Assert requested and source coordinates are separate
    assert obs.requested_coordinates.latitude != obs.source_coordinates.latitude
    assert obs.source_coordinates.elevation == 45.0
    assert obs.coordinate_delta_km == 2.35
    assert obs.modality == ObservationModality.FORECAST


def test_quality_status_values():
    assert QualityStatus.VALIDATED.value == "VALIDATED"
    assert QualityStatus.UNVERIFIED.value == "UNVERIFIED"
    assert QualityStatus.SUSPECT.value == "SUSPECT"
    assert QualityStatus.MISSING.value == "MISSING"
    assert QualityStatus.INVALID.value == "INVALID"


def test_modality_enum_variants():
    assert ObservationModality.GROUND_OBSERVATION.value == "GROUND_OBSERVATION"
    assert ObservationModality.MODEL_DERIVED.value == "MODEL_DERIVED"
    assert ObservationModality.SATELLITE_OBSERVATION.value == "SATELLITE_OBSERVATION"
    assert ObservationModality.REANALYSIS.value == "REANALYSIS"
    assert ObservationModality.FORECAST.value == "FORECAST"
    assert ObservationModality.HISTORICAL_REANALYSIS.value == "HISTORICAL_REANALYSIS"


def test_observation_create_schema_provenance():
    create_payload = ObservationCreate(
        provider_id="openaq",
        dataset_id="openaq_v3_ground",
        model=None,
        parameter_id="pm25",
        parameter_name="Particulate Matter PM2.5",
        value=12.5,
        unit="µg/m³",
        timestamp_utc=datetime.now(timezone.utc),
        time_standard="UTC",
        modality=ObservationModality.GROUND_OBSERVATION,
        quality_status=QualityStatus.VALIDATED,
        requested_latitude=40.7128,
        requested_longitude=-74.0060,
        source_latitude=40.7130,
        source_longitude=-74.0055,
        source_elevation=10.0,
        station_id="station-ny-1",
        source_attribution="OpenAQ Community",
    )
    assert create_payload.modality == ObservationModality.GROUND_OBSERVATION
    assert create_payload.time_standard == "UTC"
    assert create_payload.source_latitude == 40.7130
    assert create_payload.requested_latitude == 40.7128
