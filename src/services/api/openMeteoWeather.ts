/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Open-Meteo Weather API Integration Client
 * Fetches physical weather variables from numerical weather models (DWD ICON, NOAA GFS, ECMWF IFS).
 */

import { fetchWithRetry } from './client';
import { apiCache } from './cache';
import { assertValidCoordinates } from '../../utils/coordinates';
import {
  EnvironmentalObservation,
  TimeSeriesDataset,
  QualityStatus,
  DataModality,
} from '../../types/environmental';
import { getParameterByCode } from '../../utils/parameters';

export interface OpenMeteoWeatherResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  current_units: Record<string, string>;
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
    surface_pressure: number;
  };
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    precipitation: number[];
    surface_pressure: number[];
  };
}

export interface WeatherDataResult {
  latitude: number;
  longitude: number;
  elevationMeters: number;
  timezone: string;
  currentObservations: EnvironmentalObservation[];
  hourlyDatasets: Record<string, TimeSeriesDataset>;
  rawResponse: OpenMeteoWeatherResponse;
  fetchedAt: string;
  /** Explicit indicator: /v1/forecast integrates NWP forecast/recent analysis, NOT multi-decade reanalysis */
  historicalReanalysisIntegrated: false;
}

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
  options: { pastDays?: number; forecastDays?: number } = {}
): Promise<WeatherDataResult> {
  // Strict coordinate assertion: reject without clamping
  assertValidCoordinates(latitude, longitude);

  const pastDays = options.pastDays ?? 1;
  const forecastDays = options.forecastDays ?? 3;
  const cacheKey = `weather_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${pastDays}_${forecastDays}`;

  const cached = apiCache.get<WeatherDataResult>(cacheKey);
  if (cached) return cached;

  const url = new URL(WEATHER_API_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure'
  );
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure'
  );
  url.searchParams.set('past_days', pastDays.toString());
  url.searchParams.set('forecast_days', forecastDays.toString());
  url.searchParams.set('timezone', 'UTC');

  const raw = await fetchWithRetry<OpenMeteoWeatherResponse>(url.toString(), {
    provider: 'Open-Meteo Weather',
  });

  const fetchedAt = new Date().toISOString();
  const currentObsTime = raw.current?.time ? `${raw.current.time}:00Z` : fetchedAt;

  // Map current readings into standardized EnvironmentalObservation
  // Scientific note: Data from /v1/forecast is Numerical Weather Prediction (NWP) model analysis,
  // classified strictly as MODEL_DERIVED (not historical REANALYSIS or ground sensors).
  const currentObservations: EnvironmentalObservation[] = [];

  const mappings: { code: string; apiKey: keyof typeof raw.current; modality: DataModality }[] = [
    { code: 'temperature_2m', apiKey: 'temperature_2m', modality: 'MODEL_DERIVED' },
    { code: 'relative_humidity', apiKey: 'relative_humidity_2m', modality: 'MODEL_DERIVED' },
    { code: 'wind_speed_10m', apiKey: 'wind_speed_10m', modality: 'MODEL_DERIVED' },
    { code: 'wind_direction_10m', apiKey: 'wind_direction_10m', modality: 'MODEL_DERIVED' },
    { code: 'precipitation', apiKey: 'precipitation', modality: 'MODEL_DERIVED' },
    { code: 'surface_pressure', apiKey: 'surface_pressure', modality: 'MODEL_DERIVED' },
  ];

  for (const item of mappings) {
    const val = raw.current ? (raw.current[item.apiKey] as number) : null;
    const paramDef = getParameterByCode(item.code);
    const unit = raw.current_units?.[item.apiKey] || paramDef?.unit || '';

    currentObservations.push({
      id: `om-weather-${item.code}-${raw.current?.time || Date.now()}`,
      sourceId: 'open-meteo',
      sourceName: 'Open-Meteo Weather (NWP Model)',
      datasetOrModel: 'NWP Operational Analysis',
      parameter: item.code,
      value: typeof val === 'number' && !Number.isNaN(val) ? val : null,
      unit,
      latitude: raw.latitude,
      longitude: raw.longitude,
      observedAt: currentObsTime,
      fetchedAt,
      timeStandard: 'UTC',
      modality: item.modality,
      qualityStatus: 'verified',
      elevationMeters: raw.elevation,
    });
  }

  // Map hourly arrays into TimeSeriesDatasets
  const hourlyDatasets: Record<string, TimeSeriesDataset> = {};
  const times = raw.hourly?.time || [];
  const nowUtc = new Date().toISOString();

  for (const item of mappings) {
    const paramDef = getParameterByCode(item.code);
    if (!paramDef) continue;

    const values = (raw.hourly as any)?.[item.apiKey] || [];
    const points = times.map((t: string, idx: number) => {
      const isoTime = `${t}:00Z`;
      const isForecast = isoTime > nowUtc;
      const v = values[idx];
      return {
        timestamp: isoTime,
        value: typeof v === 'number' && !Number.isNaN(v) ? v : null,
        isForecast,
        timeStandard: 'UTC' as const,
      };
    });

    hourlyDatasets[item.code] = {
      parameter: paramDef,
      provider: 'Open-Meteo Weather',
      datasetOrModel: 'NWP Operational Model (ECMWF/GFS/ICON)',
      modality: 'FORECAST',
      unit: raw.hourly_units?.[item.apiKey] || paramDef.unit,
      timeStandard: 'UTC',
      points,
    };
  }

  const result: WeatherDataResult = {
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevationMeters: raw.elevation,
    timezone: raw.timezone,
    currentObservations,
    hourlyDatasets,
    rawResponse: raw,
    fetchedAt,
    historicalReanalysisIntegrated: false,
  };

  // Cache for 5 minutes
  apiCache.set(cacheKey, result, 300_000);
  return result;
}
