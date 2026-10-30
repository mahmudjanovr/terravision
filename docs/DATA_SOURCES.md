# TERRAVISION Data Source Specification — Phase 2 Ingestion Architecture

## 1. Multi-Provider Strategy & Modality Matrix
TERRAVISION enforces strict ontological boundaries across data modalities to prevent scientific distortion. Observations from ground sensor stations are never conflated with atmospheric models or satellite column densities:

| Provider | Ingestion Endpoint | Modality | Primary Parameters | Spatial Coverage & Resolution | Latency / Cadence | Authentication |
|---|---|---|---|---|---|---|
| **Open-Meteo Weather** | `https://api.open-meteo.com/v1/forecast` | `MODEL_DERIVED` / `FORECAST` | Temperature (2m), Relative Humidity (2m), Wind Speed (10m), Wind Direction, Precipitation, Surface Pressure | Global (0.1° / ~11 km mesh) | Current + 24h Hourly Forecast | Open (No Key Required) |
| **Open-Meteo Air Quality** | `https://air-quality-api.open-meteo.com/v1/air-quality` | `MODEL_DERIVED` | PM2.5, PM10, Nitrogen Dioxide (NO₂), Sulphur Dioxide (SO₂), Ozone (O₃), Carbon Monoxide (CO) | Global (CAMS / SILAM 0.25° grid) | Current + 24h Hourly Model Output | Open (No Key Required) |
| **OpenAQ v3** | `/api/openaq/locations` & `/locations/{id}` | `GROUND_OBSERVATION` | Ground-level PM2.5, PM10, NO₂, SO₂, O₃, CO sensor observations | Worldwide point coordinates (Govt & Citizen monitoring stations) | Station-dependent (10-min to 1-hr) | Secure Server Proxy via `OPENAQ_API_KEY` header (`X-API-Key`) |
| **NASA POWER** | `https://power.larc.nasa.gov/api/temporal/daily/point` | `SATELLITE_OBSERVATION` / `REANALYSIS` | All-Sky Surface Shortwave Downward Irradiance (`ALLSKY_SFC_SW_DWN`), T2M, RH2M, PRECTOTCORR, WS10M | Global grid (0.5° × 0.625°) | Daily Climatological & Solar Archive | Open (No Key Required) |
| **Copernicus CDS** | ECMWF Climate Data Store | `REANALYSIS` | ERA5 atmospheric and surface climate variables | Global 31 km grid | Monthly / Hourly Reanalysis Archive | API Key + Licence agreement |
| **Copernicus Data Space** | Sentinel-5P TROPOMI | `SATELLITE_OBSERVATION` | Tropospheric NO₂, O₃, SO₂, CO column densities | Orbit swath (3.5 × 5.5 km at nadir) | Daily global overpass | OData / OpenSearch token |

---

## 2. Ingestion Contracts & Data Models

### A. Core Observation Model (`EnvironmentalObservation`)
```typescript
export interface EnvironmentalObservation {
  id: string;
  sourceId: string;
  locationId?: string;
  parameter: string;
  value: number | null;
  unit: string;
  latitude: number;
  longitude: number;
  observedAt: string; // ISO 8601 UTC
  fetchedAt: string;  // ISO 8601 UTC
  modality: 'GROUND_OBSERVATION' | 'MODEL_DERIVED' | 'SATELLITE_OBSERVATION' | 'REANALYSIS' | 'FORECAST';
  qualityStatus: 'verified' | 'unverified' | 'preliminary' | 'sensor_maintenance' | 'anomalous_flagged';
  elevation?: number;
  rawPayloadSnippet?: Record<string, unknown>;
}
```

### B. Time Series Model (`TimeSeriesDataset`)
```typescript
export interface TimeSeriesPoint {
  timestamp: string; // ISO 8601 UTC
  value: number | null;
  quality?: 'verified' | 'preliminary' | 'modeled' | 'forecast';
}

export interface TimeSeriesDataset {
  parameter: string;
  unit: string;
  sourceId: string;
  modality: DataModality;
  resolution: 'hourly' | 'daily' | 'raw';
  points: TimeSeriesPoint[];
}
```

---

## 3. Resilience, Caching & Rate-Limiting Architecture
1. **In-Memory TTL Caching (`apiCache`)**:
   - Live Weather & Air Quality: 10-minute TTL (`600,000 ms`).
   - NASA POWER Daily & Climatology: 1-hour TTL (`3,600,000 ms`).
   - Station Lists & Metadata: 30-minute TTL.
2. **Network Resilience (`fetchWithRetry`)**:
   - Configurable timeout (10,000 ms default via `AbortController`).
   - Up to 2 automatic retries for transient HTTP errors (429, 500, 502, 503, 504).
   - Exponential backoff with jitter (500ms initial delay).
3. **Missing Value Sanitization**:
   - NASA POWER `-999` and `-999.0` sentinel missing fill values are mapped to `null`.
   - Open-Meteo `null` slots are filtered or marked as missing data points.
   - Missing stations or unauthorized responses surface structured UI guidance rather than unhandled exceptions.
