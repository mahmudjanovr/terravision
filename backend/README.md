# TERRAVISION — FastAPI Backend & Geospatial Intelligence Service

Part of **TERRAVISION: Global Environmental Intelligence Platform** (Phase 3.1).

## Architecture Overview

```
backend/
├── app/
│   ├── main.py                  # FastAPI application with lifespan & CORS
│   ├── core/                    # Settings (Pydantic v2), logging, exceptions
│   ├── db/                      # SQLAlchemy 2.x async session & PostGIS base
│   ├── models/                  # EnvironmentalObservation PostGIS model (SRID 4326)
│   ├── schemas/                 # Pydantic v2 schemas for coordinates, provenance, health
│   ├── repositories/            # PostGIS ST_DWithin spatial queries and CRUD
│   ├── services/
│   │   ├── cache.py             # Redis async client with in-memory TTL fallback
│   │   └── providers/           # Open-Meteo, Historical Archive, NASA POWER, OpenAQ, Copernicus
│   └── api/
│       ├── router.py            # API master router
│       └── v1/                  # health, environmental, climate, air-quality, data-sources
├── migrations/                  # Alembic database migrations
├── tests/                       # Pytest asynchronous unit & integration test suite
├── docker-compose.yml           # PostgreSQL 16 + PostGIS 3.4 & Redis 7
├── requirements.txt             # Python dependencies
└── pyproject.toml               # Project metadata & pytest configuration
```

## Scientific & Data Integrity Principles

1. **Explicit Coordinate Provenance**:
   - `requested_latitude` / `requested_longitude`: Exact coordinates requested by the user.
   - `source_latitude` / `source_longitude` / `source_elevation`: Actual physical station or model-grid centroid returned by the provider.
   - `coordinate_delta_km`: Haversine great-circle distance between requested and source coordinates.
   - NEVER clamp, mutate, or overwrite requested coordinates with model-grid coordinates.

2. **Modality Distinctions**:
   - `OBSERVATION`: Physical in-situ ground stations (e.g. OpenAQ v3).
   - `FORECAST`: Numerical weather prediction models (e.g. Open-Meteo GFS/IFS).
   - `REANALYSIS` / `HISTORICAL_REANALYSIS`: Historical atmospheric reanalyses (e.g. ECMWF ERA5, ERA5-Land).
   - `MODEL_DERIVED`: Satellite assimilation models (e.g. NASA POWER, CAMS).

3. **Spatial Resolution Standards**:
   - **ECMWF ERA5**: ~0.25° (~25 km angular grid).
   - **ECMWF ERA5-Land**: ~0.1° (~11 km angular grid).
   - **ECMWF IFS**: ~9 km (operational high-resolution forecast only).

4. **Copernicus CDS Status**:
   - Explicitly classified as `NOT_CONFIGURED` unless authorized CDS credentials are provided. Never falsely claims operational live API access.

## Running Locally

### 1. Using Virtualenv
```bash
python3 -m virtualenv backend/.venv
./backend/.venv/bin/pip install -r backend/requirements.txt
./backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

### 2. Using Docker Compose
```bash
docker compose up -d
```

### 3. Running Migrations
```bash
cd backend
../backend/.venv/bin/alembic upgrade head
```

### 4. Running Pytest Suite
```bash
./backend/.venv/bin/pytest backend/tests
```
