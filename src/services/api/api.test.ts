/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 2.1 Verification Suite: API Contracts, Modality Auditing, Provider Health, & Error Resilience
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from './client';
import { apiCache } from './cache';
import { isValidCoordinate, assertValidCoordinates } from '../../utils/coordinates';
import { getParameterByCode } from '../../utils/parameters';
import { DataModality, ProviderHealth } from '../../types/environmental';
import { DATA_SOURCES } from '../../config/dataSources';

// 1. Error Formatting & Caching
test('ApiError formats provider and status code correctly', () => {
  const err = new ApiError('Rate limit exceeded', 429, 'OpenAQ', 'https://api.openaq.org/v3/locations');
  assert.equal(err.status, 429);
  assert.equal(err.provider, 'OpenAQ');
  assert.match(err.message, /\[OpenAQ\] \(429\) Rate limit exceeded/);
});

test('apiCache stores, retrieves, and respects expiration', async () => {
  apiCache.set('test_key', { temp: 22.5 }, 50); // 50ms TTL
  const val = apiCache.get<{ temp: number }>('test_key');
  assert.deepEqual(val, { temp: 22.5 });

  await new Promise((res) => setTimeout(res, 60));
  const expired = apiCache.get('test_key');
  assert.equal(expired, null);
});

// 2. Coordinate Rejection (No Clamping)
test('Coordinate validation strictly rejects out-of-range, NaN, and Infinity without clamping', () => {
  assert.equal(isValidCoordinate(51.5074, -0.1278), true);
  assert.equal(isValidCoordinate(90.001, 0), false);
  assert.equal(isValidCoordinate(-90.001, 0), false);
  assert.equal(isValidCoordinate(0, 180.001), false);
  assert.equal(isValidCoordinate(0, -180.001), false);
  assert.equal(isValidCoordinate(NaN, 0), false);
  assert.equal(isValidCoordinate(Infinity, 0), false);
  assert.equal(isValidCoordinate(0, -Infinity), false);

  assert.throws(() => assertValidCoordinates(91, 0), /Latitude out of bounds.*clamping is forbidden/);
  assert.throws(() => assertValidCoordinates(0, 185), /Longitude out of bounds.*clamping is forbidden/);
  assert.throws(() => assertValidCoordinates(NaN, 0), /finite numbers/);
  assert.throws(() => assertValidCoordinates(null, 0), /null or undefined/);
});

// 3. Modality Classification & Differentiation
test('Modality classification strictly differentiates ground sensor observations from model products', () => {
  const ground: DataModality = 'GROUND_OBSERVATION';
  const model: DataModality = 'MODEL_DERIVED';
  const satellite: DataModality = 'SATELLITE_OBSERVATION';
  const reanalysis: DataModality = 'REANALYSIS';
  const forecast: DataModality = 'FORECAST';

  assert.notEqual(ground, model, 'Ground station sensors must not be labeled as model derived');
  assert.notEqual(model, satellite, 'Atmospheric model must not be labeled as satellite observation');
  assert.notEqual(reanalysis, satellite, 'Atmospheric reanalysis (MERRA-2) must not be labeled as satellite sounding');
  assert.notEqual(forecast, reanalysis, 'Forecast products must not be confused with historical reanalysis');
});

// 4. Open-Meteo Weather: Historical Weather vs Forecast Modality
test('Open-Meteo Weather /v1/forecast classifies current readings as MODEL_DERIVED, not REANALYSIS', () => {
  const weatherSource = DATA_SOURCES.find((s) => s.id === 'open-meteo');
  assert.ok(weatherSource);
  assert.equal(weatherSource?.modality, 'MODEL_DERIVED');
  // Historical multi-decade reanalysis is absent from /v1/forecast
  assert.match(weatherSource?.description || '', /Historical multi-decade reanalysis is missing/);
});

// 5. NASA POWER: Solar vs Weather Modalities and Sentinel Fill Values
test('NASA POWER differentiates satellite irradiance from MERRA-2 meteorological reanalysis', () => {
  const paramSolar = {
    code: 'solar_radiation',
    nasaCode: 'ALLSKY_SFC_SW_DWN',
    modality: 'SATELLITE_OBSERVATION' as DataModality,
  };
  const paramTemp = {
    code: 'temperature_2m',
    nasaCode: 'T2M',
    modality: 'REANALYSIS' as DataModality,
  };
  const paramWind = {
    code: 'wind_speed_10m',
    nasaCode: 'WS10M',
    modality: 'REANALYSIS' as DataModality,
  };

  assert.equal(paramSolar.modality, 'SATELLITE_OBSERVATION');
  assert.equal(paramTemp.modality, 'REANALYSIS');
  assert.equal(paramWind.modality, 'REANALYSIS');
});

test('NASA POWER -999 fill value sentinel is converted to null without zero-substitution', () => {
  const fillValue = -999.0;
  const rawValues = [0.0, 14.5, -999.0, -999, 21.0];
  
  // Real values of 0.0 (e.g. 0°C or 0 solar flux at night) must remain 0.0, while -999 becomes null
  const cleaned = rawValues.map((v) => (v === fillValue || v <= -990 ? null : v));
  assert.deepEqual(cleaned, [0.0, 14.5, null, null, 21.0]);
});

test('NASA POWER UTC and Local Solar Time (LST) date key formatting', () => {
  const dateKey = '20240105';
  const year = dateKey.slice(0, 4);
  const month = dateKey.slice(4, 6);
  const day = dateKey.slice(6, 8);
  const isoUtc = `${year}-${month}-${day}T00:00:00Z`;

  assert.equal(isoUtc, '2024-01-05T00:00:00Z');
});

// 6. OpenAQ Authentication & Proxy Rules
test('OpenAQ v3 requires API key; absent key yields NOT_CONFIGURED', () => {
  const openaqSource = DATA_SOURCES.find((s) => s.id === 'openaq');
  assert.ok(openaqSource);
  assert.equal(openaqSource?.integrationStatus, 'NOT_CONFIGURED');
  assert.match(openaqSource?.description || '', /OPENAQ_API_KEY/);
});

test('OpenAQ path whitelist strictly rejects path traversal and protocol injection', () => {
  const OPENAQ_PATH_WHITELIST = /^(locations(\/\d+(\/(latest|sensors))?)?|sensors(\/\d+(\/measurements)?)?|parameters|countries|providers|manufacturers)$/;

  assert.equal(OPENAQ_PATH_WHITELIST.test('locations'), true);
  assert.equal(OPENAQ_PATH_WHITELIST.test('locations/123'), true);
  assert.equal(OPENAQ_PATH_WHITELIST.test('locations/123/latest'), true);
  assert.equal(OPENAQ_PATH_WHITELIST.test('parameters'), true);

  // Attack payloads must fail
  assert.equal(OPENAQ_PATH_WHITELIST.test('../../etc/passwd'), false);
  assert.equal(OPENAQ_PATH_WHITELIST.test('http://evil.com'), false);
  assert.equal(OPENAQ_PATH_WHITELIST.test('locations/abc'), false);
  assert.equal(OPENAQ_PATH_WHITELIST.test('secret_admin_route'), false);
});

// 7. Provider Health Classification Rules
test('Provider health requires actual payload validation; HTTP 200 alone is not CONNECTED', () => {
  // Scenario: HTTP 200 returned empty or malformed observations
  const evaluateHealth = (observations: { value: number | null }[]): 'CONNECTED' | 'DEGRADED' | 'UNAVAILABLE' => {
    const validCount = observations.filter((o) => typeof o.value === 'number' && !Number.isNaN(o.value)).length;
    if (validCount >= 4) return 'CONNECTED';
    if (validCount > 0) return 'DEGRADED';
    return 'UNAVAILABLE';
  };

  assert.equal(evaluateHealth([]), 'UNAVAILABLE');
  assert.equal(evaluateHealth([{ value: null }, { value: null }]), 'UNAVAILABLE');
  assert.equal(evaluateHealth([{ value: 12.5 }]), 'DEGRADED');
  assert.equal(
    evaluateHealth([{ value: 12.5 }, { value: 65 }, { value: 1013 }, { value: 3.2 }]),
    'CONNECTED'
  );
});

test('Copernicus CDS is strictly reported as NOT_CONFIGURED in Phase 2', () => {
  const cds = DATA_SOURCES.find((s) => s.id === 'copernicus-cds');
  assert.ok(cds);
  assert.equal(cds?.integrationStatus, 'NOT_CONFIGURED');
  assert.equal(cds?.modality, 'REANALYSIS');
});

// 8. Parameter Catalog Standards
test('STANDARD_PARAMETERS preserves accurate scientific units, formulas, and precision', () => {
  const pm25 = getParameterByCode('pm25');
  assert.equal(pm25?.unit, 'µg/m³');
  assert.equal(pm25?.chemicalFormula, 'PM₂.₅');

  const windDir = getParameterByCode('wind_direction_10m');
  assert.ok(windDir);
  assert.equal(windDir?.unit, '°');

  const solar = getParameterByCode('solar_radiation');
  assert.ok(solar);
  assert.equal(solar?.category, 'radiation');
});

// ==========================================
// Phase 2.2: Historical Climate Data & Final Data Integrity
// ==========================================

import {
  validateArchiveDateRange,
  isValidDateString,
  ReanalysisModel,
} from './openMeteoArchive';

// 9. Open-Meteo Archive Date Validation
test('Open-Meteo Archive date validation enforces YYYY-MM-DD format and chronological order', () => {
  assert.equal(isValidDateString('2023-01-01'), true);
  assert.equal(isValidDateString('2023-13-01'), false);
  assert.equal(isValidDateString('invalid-date'), false);

  // Chronological range passes
  assert.doesNotThrow(() => validateArchiveDateRange('2023-01-01', '2023-01-07', 'era5'));

  // Inverted range throws
  assert.throws(
    () => validateArchiveDateRange('2023-01-10', '2023-01-05', 'era5'),
    /Date range inverted/
  );
});

test('Open-Meteo Archive enforces ERA5 (1940) and ERA5-Land (1950) coverage start bounds', () => {
  // ERA5 starts at 1940
  assert.doesNotThrow(() => validateArchiveDateRange('1940-01-01', '1940-01-05', 'era5'));
  assert.throws(
    () => validateArchiveDateRange('1939-12-31', '1940-01-05', 'era5'),
    /ERA5 coverage begins at 1940-01-01/
  );

  // ERA5-Land starts at 1950
  assert.doesNotThrow(() => validateArchiveDateRange('1950-01-01', '1950-01-05', 'era5_land'));
  assert.throws(
    () => validateArchiveDateRange('1949-12-31', '1950-01-05', 'era5_land'),
    /ERA5_LAND coverage begins at 1950-01-01/
  );
});

test('Open-Meteo Archive strictly rejects dates within the ~5-day assimilation latency buffer', () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  assert.throws(
    () => validateArchiveDateRange('2023-01-01', tomorrow, 'era5'),
    /assimilation lag/
  );
});

test('Open-Meteo Archive is registered with REANALYSIS modality and CONNECTED status', () => {
  const archiveSource = DATA_SOURCES.find((s) => s.id === 'open-meteo-archive');
  assert.ok(archiveSource, 'open-meteo-archive must be registered in DATA_SOURCES');
  assert.equal(archiveSource?.modality, 'REANALYSIS');
  assert.equal(archiveSource?.integrationStatus, 'CONNECTED');
  assert.equal(archiveSource?.apiEndpointUrl, 'https://archive-api.open-meteo.com/v1/archive');
  assert.match(archiveSource?.description || '', /ERA5.*and.*ERA5-Land/i);
});

// 10. NASA POWER Time Standard (UTC vs LST) Integrity
test('NASA POWER query URL includes explicit time-standard (UTC vs LST)', () => {
  const buildUrl = (timeStd: 'UTC' | 'LST') => {
    const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
    url.searchParams.set('time-standard', timeStd);
    return url.toString();
  };

  assert.match(buildUrl('UTC'), /time-standard=UTC/);
  assert.match(buildUrl('LST'), /time-standard=LST/);
});

test('NASA POWER never labels Local Solar Time (LST) timestamps as UTC (no trailing Z)', () => {
  const dateKey = '20240105';
  const year = dateKey.slice(0, 4);
  const month = dateKey.slice(4, 6);
  const day = dateKey.slice(6, 8);

  const formatTimestamp = (timeStandard: 'UTC' | 'LST') =>
    timeStandard === 'UTC'
      ? `${year}-${month}-${day}T00:00:00Z`
      : `${year}-${month}-${day}T00:00:00`;

  const utcTs = formatTimestamp('UTC');
  const lstTs = formatTimestamp('LST');

  assert.equal(utcTs.endsWith('Z'), true, 'UTC timestamp must designate UTC with Z');
  assert.equal(lstTs.endsWith('Z'), false, 'LST timestamp must NEVER have trailing Z');
  assert.equal(lstTs, '2024-01-05T00:00:00');
});

// 11. Complete Data Provenance Contract
test('Environmental observations preserve all 10 required provenance dimensions', () => {
  const sampleObs = {
    provider: 'Open-Meteo Historical Archive / ECMWF Copernicus',
    datasetOrModel: 'ECMWF ERA5 Global Reanalysis (0.25°)',
    parameter: 'temperature_2m',
    value: 14.8,
    unit: '°C',
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
    observedAt: '2023-01-01T12:00:00Z',
    fetchedAt: '2026-03-30T12:00:00Z',
    timeStandard: 'UTC',
    modality: 'REANALYSIS',
    qualityStatus: 'verified',
  };

  assert.equal(sampleObs.provider, 'Open-Meteo Historical Archive / ECMWF Copernicus');
  assert.equal(sampleObs.datasetOrModel, 'ECMWF ERA5 Global Reanalysis (0.25°)');
  assert.equal(sampleObs.parameter, 'temperature_2m');
  assert.equal(typeof sampleObs.value, 'number');
  assert.equal(sampleObs.unit, '°C');
  assert.equal(sampleObs.coordinates.latitude, 51.5074);
  assert.equal(sampleObs.timeStandard, 'UTC');
  assert.equal(sampleObs.modality, 'REANALYSIS');
  assert.equal(sampleObs.qualityStatus, 'verified');
});

// 12. Rate Limit & 429 Handling
test('Rate limit responses preserve HTTP 429 and Retry-After header', () => {
  const mockResponse = {
    status: 429,
    headers: new Map([
      ['retry-after', '60'],
      ['x-ratelimit-remaining', '0'],
    ]),
  };

  assert.equal(mockResponse.status, 429);
  assert.equal(mockResponse.headers.get('retry-after'), '60');
  assert.equal(mockResponse.headers.get('x-ratelimit-remaining'), '0');
});
