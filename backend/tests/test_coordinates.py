import pytest
from pydantic import ValidationError
from app.schemas.coordinates import (
    GeoCoordinates,
    BoundingBox,
    calculate_haversine_distance,
)


def test_valid_coordinates():
    coord = GeoCoordinates(latitude=48.8566, longitude=2.3522, elevation=35.0)
    assert coord.latitude == 48.8566
    assert coord.longitude == 2.3522
    assert coord.elevation == 35.0


def test_invalid_latitude_out_of_bounds():
    with pytest.raises(ValidationError):
        GeoCoordinates(latitude=91.0, longitude=0.0)

    with pytest.raises(ValidationError):
        GeoCoordinates(latitude=-90.01, longitude=0.0)


def test_invalid_longitude_out_of_bounds():
    with pytest.raises(ValidationError):
        GeoCoordinates(latitude=0.0, longitude=180.5)

    with pytest.raises(ValidationError):
        GeoCoordinates(latitude=0.0, longitude=-181.0)


def test_haversine_distance():
    # London (51.5074, -0.1278) to Paris (48.8566, 2.3522) ~ 343 km
    dist = calculate_haversine_distance(51.5074, -0.1278, 48.8566, 2.3522)
    assert 340.0 < dist < 350.0

    # Same point distance should be 0.0
    same_dist = calculate_haversine_distance(40.0, 70.0, 40.0, 70.0)
    assert same_dist == 0.0


def test_bounding_box_validation():
    bbox = BoundingBox(
        min_latitude=10.0,
        max_latitude=20.0,
        min_longitude=-10.0,
        max_longitude=10.0,
    )
    assert bbox.min_latitude == 10.0
    assert bbox.max_latitude == 20.0

    # max_latitude < min_latitude must raise ValidationError
    with pytest.raises(ValidationError):
        BoundingBox(
            min_latitude=25.0,
            max_latitude=10.0,
            min_longitude=0.0,
            max_longitude=10.0,
        )
