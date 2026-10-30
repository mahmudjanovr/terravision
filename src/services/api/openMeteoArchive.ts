/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Open-Meteo Historical Weather Archive Client
 * Retrieves multi-decade historical climate reanalysis datasets (ERA5 and ERA5-Land).
 * All data points are strictly classified as REANALYSIS modality with full provenance tracking.
 */

import { fetchWithRetry } from './client';
import { apiCache } from './cache';
import { assertValidCoordinates } from '../../utils/coordinates';
import {
  EnvironmentalObservation,
  TimeSeriesDataset,
  DataModality,
} from '../../types/environmental';
import { getParameterByCode } from '../../utils/parameters';

export type ReanalysisModel = 'era5' | 'era5_land';

export interface OpenMeteoArchiveResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    precipitation?: (number | null)[];
    surface_pressure?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
  };
}

export interface HistoricalReanalysisResult {
  latitude: number;
  longitude: number;
  elevationMeters: number;
  model: ReanalysisModel;
  modelDisplayName: string;
  startDate: string;
  endDate: string;
  timeStandard: 'UTC';
  modality: 'REANALYSIS';
  datasets: Record<string, TimeSeriesDataset>;
  observations: EnvironmentalObservation[];
  fetchedAt: string;
  rawResponse?: OpenMeteoArchiveResponse;
}

export interface ArchiveQueryOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  model?: ReanalysisModel;
}

const ARCHIVE_API_URL = 'https://archive-api.open-meteo.com/v1/archive';

/**
 * Validates a YYYY-MM-DD date string.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

/**
 * Validates date ranges for the Open-Meteo Historical Archive.
 * ERA5 starts from 1940-01-01; ERA5-Land starts from 1950-01-01.
 * Archive data has approximately a 5-day latency window relative to current UTC time.
 */
export function validateArchiveDateRange(
  startDate: string,
  endDate: string,
  model: ReanalysisModel = 'era5'
): void {
  if (!isValidDateString(startDate)) {
    throw new Error(`Invalid start_date '${startDate}'. Must be YYYY-MM-DD format.`);
  }
  if (!isValidDateString(endDate)) {
    throw new Error(`Invalid end_date '${endDate}'. Must be YYYY-MM-DD format.`);
  }

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (start.getTime() > end.getTime()) {
    throw new Error(
      `Date range inverted: start_date '${startDate}' cannot be later than end_date '${endDate}'.`
    );
  }

  const minYear = model === 'era5_land' ? 1950 : 1940;
  const minDate = new Date(`${minYear}-01-01T00:00:00Z`);
  if (start.getTime() < minDate.getTime()) {
    throw new Error(
      `Historical model ${model.toUpperCase()} coverage begins at ${minYear}-01-01. Requested start '${startDate}' is outside dataset bounds.`
    );
  }

  // Calculate maximum allowed date (current UTC time minus 5 days reanalysis processing buffer)
  const now = new Date();
  const maxAllowed = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 5));
  if (end.getTime() > maxAllowed.getTime()) {
    const maxStr = maxAllowed.toISOString().split('T')[0];
    throw new Error(
      `Archive reanalysis dataset has ~5-day assimilation lag. Requested end_date '${endDate}' exceeds latest available reanalysis archive (${maxStr}). For operational forecasts and recent days, use the weather forecast endpoint.`
    );
  }
}

/**
 * Fetches genuine historical climate reanalysis from Open-Meteo Archive API.
 */
export async function fetchHistoricalReanalysis(
  latitude: number,
  longitude: number,
  options: ArchiveQueryOptions
): Promise<HistoricalReanalysisResult> {
  // 1. Strict coordinate validation without clamping
  assertValidCoordinates(latitude, longitude);

  const model: ReanalysisModel = options.model || 'era5';
  const { startDate, endDate } = options;

  // 2. Validate historical date range and model bounds
  validateArchiveDateRange(startDate, endDate, model);

  const cacheKey = `om_archive_${model}_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${startDate}_${endDate}`;
  const cached = apiCache.get<HistoricalReanalysisResult>(cacheKey);
  if (cached) return cached;

  const url = new URL(ARCHIVE_API_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m'
  );
  url.searchParams.set('models', model);
  url.searchParams.set('timezone', 'UTC');

  const raw = await fetchWithRetry<OpenMeteoArchiveResponse>(url.toString(), {
    provider: `Open-Meteo Historical Archive (${model.toUpperCase()})`,
    timeoutMs: 20_000,
    retries: 2,
  });

  const fetchedAt = new Date().toISOString();
  const modelDisplayName =
    model === 'era5_land'
      ? 'ECMWF ERA5-Land Reanalysis (0.1° / 9 km)'
      : 'ECMWF ERA5 Global Reanalysis (0.25° / 31 km)';

  const datasets: Record<string, TimeSeriesDataset> = {};
  const observations: EnvironmentalObservation[] = [];

  const timeArray = raw.hourly?.time || [];

  const paramMappings: {
    apiKey: keyof OpenMeteoArchiveResponse['hourly'];
    code: string;
    fallbackUnit: string;
  }[] = [
    { apiKey: 'temperature_2m', code: 'temperature_2m', fallbackUnit: '°C' },
    { apiKey: 'relative_humidity_2m', code: 'relative_humidity', fallbackUnit: '%' },
    { apiKey: 'precipitation', code: 'precipitation', fallbackUnit: 'mm' },
    { apiKey: 'surface_pressure', code: 'surface_pressure', fallbackUnit: 'hPa' },
    { apiKey: 'wind_speed_10m', code: 'wind_speed_10m', fallbackUnit: 'km/h' },
    { apiKey: 'wind_direction_10m', code: 'wind_direction_10m', fallbackUnit: '°' },
  ];

  for (const item of paramMappings) {
    const rawValues = raw.hourly?.[item.apiKey] as (number | null)[] | undefined;
    if (!rawValues || rawValues.length === 0) continue;

    const paramDef = getParameterByCode(item.code);
    const unit = raw.hourly_units?.[item.apiKey] || paramDef?.unit || item.fallbackUnit;

    const points = timeArray.map((t, idx) => {
      const v = rawValues[idx];
      const validValue =
        typeof v === 'number' && !Number.isNaN(v) && v !== null ? v : null;
      return {
        timestamp: `${t}:00Z`,
        value: validValue,
        isForecast: false,
        timeStandard: 'UTC' as const,
      };
    });

    if (paramDef) {
      datasets[item.code] = {
        parameter: paramDef,
        provider: 'Open-Meteo Archive / ECMWF Copernicus',
        datasetOrModel: modelDisplayName,
        modality: 'REANALYSIS' as DataModality,
        unit,
        timeStandard: 'UTC',
        points,
      };
    }

    // Extract the latest valid non-null reanalysis value in the queried range
    let lastNonNullVal: number | null = null;
    let lastNonNullTime: string | null = null;

    for (let i = points.length - 1; i >= 0; i--) {
      if (points[i].value !== null) {
        lastNonNullVal = points[i].value;
        lastNonNullTime = points[i].timestamp;
        break;
      }
    }

    if (lastNonNullVal !== null && lastNonNullTime !== null) {
      observations.push({
        id: `om-archive-${model}-${item.code}-${lastNonNullTime}`,
        sourceId: 'open-meteo-archive',
        sourceName: modelDisplayName,
        datasetOrModel: model === 'era5_land' ? 'ERA5-Land' : 'ERA5',
        parameter: item.code,
        value: lastNonNullVal,
        unit,
        latitude: raw.latitude,
        longitude: raw.longitude,
        observedAt: lastNonNullTime,
        fetchedAt,
        timeStandard: 'UTC',
        modality: 'REANALYSIS',
        qualityStatus: 'verified',
        elevationMeters: raw.elevation,
      });
    }
  }

  const result: HistoricalReanalysisResult = {
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevationMeters: raw.elevation,
    model,
    modelDisplayName,
    startDate,
    endDate,
    timeStandard: 'UTC',
    modality: 'REANALYSIS',
    datasets,
    observations,
    fetchedAt,
    rawResponse: raw,
  };

  // Cache for 6 hours (historical reanalysis does not change)
  apiCache.set(cacheKey, result, 6 * 3600_000);
  return result;
}
