"""0001_initial_postgis_observations

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-31 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    op.create_table(
        "environmental_observations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("provider_id", sa.String(length=64), nullable=False),
        sa.Column("dataset_id", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=64), nullable=True),
        sa.Column("parameter_id", sa.String(length=64), nullable=False),
        sa.Column("parameter_name", sa.String(length=128), nullable=False),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("timestamp_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("retrieval_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("time_standard", sa.String(length=16), nullable=False, server_default="UTC"),
        sa.Column("modality", sa.String(length=32), nullable=False),
        sa.Column("quality_status", sa.String(length=32), nullable=False),
        sa.Column("requested_latitude", sa.Float(), nullable=False),
        sa.Column("requested_longitude", sa.Float(), nullable=False),
        sa.Column("source_latitude", sa.Float(), nullable=False),
        sa.Column("source_longitude", sa.Float(), nullable=False),
        sa.Column("source_elevation", sa.Float(), nullable=True),
        sa.Column("coordinate_delta_km", sa.Float(), nullable=True),
        sa.Column("location_name", sa.String(length=256), nullable=True),
        sa.Column("station_id", sa.String(length=128), nullable=True),
        sa.Column("source_attribution", sa.String(length=256), nullable=True),
        sa.Column("spatial_point", Geometry(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("raw_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_environmental_observations_provider_id", "environmental_observations", ["provider_id"])
    op.create_index("ix_environmental_observations_dataset_id", "environmental_observations", ["dataset_id"])
    op.create_index("ix_environmental_observations_model", "environmental_observations", ["model"])
    op.create_index("ix_environmental_observations_parameter_id", "environmental_observations", ["parameter_id"])
    op.create_index("ix_environmental_observations_timestamp_utc", "environmental_observations", ["timestamp_utc"])
    op.create_index("ix_environmental_observations_modality", "environmental_observations", ["modality"])
    op.create_index("ix_environmental_observations_quality_status", "environmental_observations", ["quality_status"])
    op.create_index("ix_environmental_observations_station_id", "environmental_observations", ["station_id"])
    op.create_index("ix_obs_param_time", "environmental_observations", ["parameter_id", "timestamp_utc"])
    op.create_index("ix_obs_provider_time", "environmental_observations", ["provider_id", "timestamp_utc"])
    op.create_index("ix_obs_requested_coords", "environmental_observations", ["requested_latitude", "requested_longitude"])

    # Environmental Regions table supporting spatial POLYGON and MULTIPOLYGON boundaries
    op.create_table(
        "environmental_regions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("region_type", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=512), nullable=True),
        sa.Column("boundary_polygon", Geometry(geometry_type="POLYGON", srid=4326), nullable=True),
        sa.Column("boundary_multipolygon", Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True),
        sa.Column("raw_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_environmental_regions_name", "environmental_regions", ["name"])
    op.create_index("ix_environmental_regions_region_type", "environmental_regions", ["region_type"])


def downgrade() -> None:
    op.drop_table("environmental_regions")
    op.drop_table("environmental_observations")
