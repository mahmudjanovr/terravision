# TERRAVISION API Specification — Phase 2 Ingestion & Backend Proxies

## 1. Backend Proxy Endpoints (`server.ts`)

The TERRAVISION backend operates an Express server (mounted with Vite middlewares in development) providing secure routing and health probing:

### `GET /api/health`
Health verification and configuration check for environmental services.
- **Response**:
```json
{
  "status": "ok",
  "phase": "Phase 2: Real-World Data Integration",
  "hasOpenAqKey": true,
  "timestamp": "2026-10-30T12:00:00.000Z"
}
```

### `GET /api/openaq/*`
Reverse proxy to OpenAQ v3 API (`https://api.openaq.org/v3/*`).
- **Security**: Injects server-side secret `OPENAQ_API_KEY` in the `X-API-Key` request header.
- **Client Security**: API credentials are never exposed in browser bundles, JavaScript code, or client network requests.
- **Error Handling**: Passes upstream status codes and returns structured 502 Bad Gateway responses when upstream connectivity fails.

---

## 2. Integrated External Endpoints

### Open-Meteo Weather API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Query Params**:
  - `latitude`: Decimal degrees [-90 to 90]
  - `longitude`: Decimal degrees [-180 to 180]
  - `current`: `temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure`
  - `hourly`: `temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure`
  - `timezone`: `UTC`
- **Modality**: `MODEL_DERIVED` / `FORECAST`

### Open-Meteo Air Quality API
- **Endpoint**: `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Query Params**:
  - `latitude`: Decimal degrees [-90 to 90]
  - `longitude`: Decimal degrees [-180 to 180]
  - `current`: `pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide`
  - `hourly`: `pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide`
  - `timezone`: `UTC`
- **Modality**: `MODEL_DERIVED` (Atmospheric chemistry models: CAMS / SILAM)

### NASA POWER API
- **Endpoint**: `https://power.larc.nasa.gov/api/temporal/daily/point`
- **Query Params**:
  - `parameters`: `ALLSKY_SFC_SW_DWN,T2M,RH2M,PRECTOTCORR,WS10M`
  - `community`: `RE`
  - `longitude`: Decimal degrees
  - `latitude`: Decimal degrees
  - `start`: YYYYMMDD
  - `end`: YYYYMMDD
  - `format`: `JSON`
- **Modality**: `SATELLITE_OBSERVATION` / `REANALYSIS`
- **Fill Handling**: Values equal to `-999` are converted to `null`.
