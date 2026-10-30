# TERRAVISION System Architecture

## 1. System Vision & Overview
TERRAVISION is a global environmental intelligence platform designed to ingest, harmonize, and visualize planetary observation data from disparate international sources.

```
+-----------------------------------------------------------------------------------+
|                            TERRAVISION CLIENT (REACT 19)                          |
|  [Global Overview] [Air Quality] [Climate] [MapLibre Map] [Analytics] [Research]  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v (REST / GeoJSON)
+-----------------------------------------------------------------------------------+
|                             FASTAPI BACKEND (PHASE 3)                             |
|    - Dynamic Ingestion Workers (httpx / Celery / Cron)                            |
|    - Data Harmonizer & SI Unit Normalizer                                         |
|    - AQI Multi-Pollutant Engine (EPA / WHO Breakpoint Models)                     |
+-----------------------------------------------------------------------------------+
         |                                           |
         v                                           v
+-----------------------------+           +-----------------------------+
|   PostgreSQL 16 + PostGIS   |           |         Redis Cache         |
|  - spatial observation logs |           |  - rate-limited tile cache  |
|  - monitoring stations      |           |  - latest parameter readouts|
+-----------------------------+           +-----------------------------+
         ^                                           ^
         |                                           |
+-----------------------------------------------------------------------------------+
|                        EXTERNAL OBSERVATION AUTHORITIES                           |
|  - Open-Meteo (High-Res Weather & Reanalysis)                                     |
|  - OpenAQ (Global Terrestrial Sensor Stations)                                    |
|  - NASA POWER (Solar Irradiance & Climatology)                                    |
|  - Copernicus CDS (ERA5 Global Atmospheric Reanalysis)                            |
|  - Copernicus Data Space (Sentinel-5P TROPOMI Satellite Spectroscopy)              |
+-----------------------------------------------------------------------------------+
```

## 2. Real Data Integrity Directives
TERRAVISION enforces strict empirical honesty across all interfaces:
1. **Zero Fabricated Observations**: No random number generators or mock metrics.
2. **Explicit Observation Sources**: Every value is traced to an authoritative provider.
3. **Observation vs Reanalysis vs Satellite**: Point-source sensor values (OpenAQ) are never confused with grid reanalysis (ERA5) or atmospheric column densities (Sentinel-5P).
4. **Transparent Offline / Pending States**: In Phase 1, honest empty states inform researchers that the backend ingestion pipeline is in development.

## 3. Technology Choices
- **React 19 & TypeScript**: Strict types, zero runtime type errors, modern hooks.
- **Tailwind CSS v4**: Cohesive dark-matter theme (`#07090e`, `#0b0f19`, cyan phosphor accents).
- **MapLibre GL JS**: Open-source, high-performance WebGL vector cartography.
- **Apache ECharts**: Scientific charting with canvas rendering and responsive observers.
- **FastAPI + PostgreSQL + PostGIS (Phase 3 Target)**: Industry standard for spatial telemetry.
