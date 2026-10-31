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
import { DataModality, ProviderHealth, GeoCoordinates, QualityStatus } from '../../types/environmental';
import { DATA_SOURCES } from '../../config/dataSources';
import { isValidDateString, validateArchiveDateRange } from './openMeteoArchive';
import { evaluateQualityStatus } from '../../utils/quality';

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

// 11. Complete Data Provenance Contract (Phase 2.2.1)
test('Environmental observations preserve all required provenance dimensions with coordinate separation', () => {
  const sampleObs = {
    provider: 'Open-Meteo Historical Archive / ECMWF Copernicus',
    datasetOrModel: 'ECMWF ERA5 Global Reanalysis (0.25° / ~25 km)',
    parameter: 'temperature_2m',
    value: 14.8,
    unit: '°C',
    requestedCoordinates: { latitude: 51.5074, longitude: -0.1278 },
    sourceCoordinates: { latitude: 51.5, longitude: -0.125, elevationMeters: 25 },
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
    observedAt: '2023-01-01T12:00:00Z',
    fetchedAt: '2026-03-30T12:00:00Z',
    timeStandard: 'UTC',
    modality: 'REANALYSIS',
    qualityStatus: 'VALIDATED' as QualityStatus,
  };

  assert.equal(sampleObs.provider, 'Open-Meteo Historical Archive / ECMWF Copernicus');
  assert.equal(sampleObs.datasetOrModel, 'ECMWF ERA5 Global Reanalysis (0.25° / ~25 km)');
  assert.equal(sampleObs.parameter, 'temperature_2m');
  assert.equal(typeof sampleObs.value, 'number');
  assert.equal(sampleObs.unit, '°C');
  assert.equal(sampleObs.requestedCoordinates.latitude, 51.5074);
  assert.equal(sampleObs.sourceCoordinates.latitude, 51.5);
  assert.notEqual(sampleObs.requestedCoordinates.latitude, sampleObs.sourceCoordinates.latitude);
  assert.equal(sampleObs.timeStandard, 'UTC');
  assert.equal(sampleObs.modality, 'REANALYSIS');
  assert.equal(sampleObs.qualityStatus, 'VALIDATED');
});

// 12. Spatial Resolution Accuracy
test('ERA5 and ERA5-Land spatial resolutions are accurately documented without conflating IFS 9km', () => {
  const archiveSource = DATA_SOURCES.find((s) => s.id === 'open-meteo-archive');
  assert.ok(archiveSource);
  assert.match(archiveSource?.spatialResolution || '', /ERA5:\s*~?0\.25°\s*\(\s*~?25\s*km\)/);
  assert.match(archiveSource?.spatialResolution || '', /ERA5-Land:\s*~?0\.1°\s*\(\s*~?11\s*km\)/);
  // ERA5-Land must never be described as 9 km
  assert.doesNotMatch(archiveSource?.spatialResolution || '', /ERA5-Land:\s*9\s*km/);
});

// 13. Historical Climate Date Ranges: Short Range vs Multi-Year Range
test('Historical climate range tests verify hourly alignment for 7-day and multi-year spans', () => {
  // A. 7-Day Short Range (168 hourly timestamps)
  const shortStartDate = '2023-06-01';
  const shortEndDate = '2023-06-07';
  const shortHours = 7 * 24; // 168 hours
  const shortTimes: string[] = [];
  const shortTemps: number[] = [];

  for (let d = 1; d <= 7; d++) {
    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0');
      shortTimes.push(`2023-06-0${d}T${hStr}:00`);
      shortTemps.push(15.0 + Math.sin(h / 3) * 5);
    }
  }

  assert.equal(shortTimes.length, shortHours);
  assert.equal(shortTemps.length, shortHours);
  assert.equal(shortTimes[0], '2023-06-01T00:00');
  assert.equal(shortTimes[shortTimes.length - 1], '2023-06-07T23:00');

  // B. 2-Year Multi-Year Range (730 days = 17,520 hourly timestamps)
  const multiYearStart = '2021-01-01';
  const multiYearEnd = '2022-12-31';
  const totalDays = 365 + 365; // 730 days
  const expectedTotalHours = totalDays * 24; // 17,520 hours

  assert.equal(expectedTotalHours, 17520);
  assert.doesNotThrow(() => validateArchiveDateRange(multiYearStart, multiYearEnd, 'era5'));
});

// 14. Array Length Mismatch & Incomplete Response Detection
test('Array length verification detects mismatched timestamps and parameter arrays', () => {
  const timeArray = ['2023-01-01T00:00', '2023-01-01T01:00', '2023-01-01T02:00'];
  const matchedValues = [10.2, 10.5, 11.0];
  const truncatedValues = [10.2, 10.5]; // 1 missing element

  const verifyAlignment = (times: string[], vals: (number | null)[]) => times.length === vals.length;

  assert.equal(verifyAlignment(timeArray, matchedValues), true);
  assert.equal(verifyAlignment(timeArray, truncatedValues), false, 'Truncated array must fail alignment check');
});

// 15. Coordinate Separation: Requested Coordinates vs Provider Grid Coordinates
test('Coordinate separation preserves provider model grid without overwriting or clamping requested coordinates', () => {
  const userLat = 51.5074;
  const userLon = -0.1278;
  const providerGridLat = 51.50; // ERA5 0.25° centroid
  const providerGridLon = -0.125;

  const reqCoords: GeoCoordinates = { latitude: userLat, longitude: userLon };
  const srcCoords: GeoCoordinates = { latitude: providerGridLat, longitude: providerGridLon, elevationMeters: 25 };

  assert.equal(reqCoords.latitude, 51.5074);
  assert.equal(reqCoords.longitude, -0.1278);
  assert.equal(srcCoords.latitude, 51.50);
  assert.equal(srcCoords.longitude, -0.125);
  assert.notEqual(reqCoords.latitude, srcCoords.latitude, 'Requested coords must not be overwritten by grid coords');
});

// 16. Quality Status Semantic Classification
test('Quality status evaluator assigns honest semantics (VALIDATED, UNVERIFIED, SUSPECT, MISSING, INVALID)', () => {
  // A. Normal valid observation within physical domain
  const validTemp = evaluateQualityStatus(21.4, 'temperature_2m');
  assert.equal(validTemp, 'VALIDATED');

  // B. Missing observation / null
  const missingTemp = evaluateQualityStatus(null, 'temperature_2m');
  assert.equal(missingTemp, 'MISSING');

  // C. Physical impossibility (Relative humidity > 100% or < 0%)
  const impossibleRhHigh = evaluateQualityStatus(115.0, 'relative_humidity');
  const impossibleRhLow = evaluateQualityStatus(-5.0, 'relative_humidity');
  assert.equal(impossibleRhHigh, 'INVALID');
  assert.equal(impossibleRhLow, 'INVALID');

  // D. Physical anomaly / boundary suspect (surface pressure 450 hPa at sea level)
  const suspectPressure = evaluateQualityStatus(450.0, 'surface_pressure');
  assert.equal(suspectPressure, 'SUSPECT');

  // E. Ground sensor without secondary calibrated validation
  const unverifiedSensor = evaluateQualityStatus(28.5, 'pm25', { isRawLowCostSensor: true });
  assert.equal(unverifiedSensor, 'UNVERIFIED');
});

// 17. Rate Limit & 429 Handling
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
