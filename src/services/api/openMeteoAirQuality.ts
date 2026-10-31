/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Open-Meteo Air Quality API Integration Client
 * Retrieves atmospheric chemistry model products (CAMS, SILAM, EURAD-IM).
 * Explicitly tagged as MODEL_DERIVED (not terrestrial ground sensor observations).
 */

import { fetchWithRetry } from './client';
import { apiCache } from './cache';
import { assertValidCoordinates } from '../../utils/coordinates';
import {
  EnvironmentalObservation,
  TimeSeriesDataset,
  DataModality,
  GeoCoordinates,
} from '../../types/environmental';
import { getParameterByCode } from '../../utils/parameters';
import { evaluateQualityStatus } from '../../utils/quality';

export interface OpenMeteoAirQualityResponse {
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
    pm10: number;
    pm2_5: number;
    nitrogen_dioxide: number;
    sulphur_dioxide: number;
    ozone: number;
    carbon_monoxide: number;
  };
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    pm10: number[];
    pm2_5: number[];
    nitrogen_dioxide: number[];
    sulphur_dioxide: number[];
    ozone: number[];
    carbon_monoxide: number[];
  };
}

export interface AirQualityModelResult {
  latitude: number;
  longitude: number;
  elevationMeters: number;
  requestedCoordinates: GeoCoordinates;
  sourceCoordinates: GeoCoordinates;
  timezone: string;
  currentObservations: EnvironmentalObservation[];
  hourlyDatasets: Record<string, TimeSeriesDataset>;
  rawResponse: OpenMeteoAirQualityResponse;
  fetchedAt: string;
  isModelDerived: true;
}

const AIR_QUALITY_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export async function fetchOpenMeteoAirQuality(
  latitude: number,
  longitude: number,
  options: { pastDays?: number; forecastDays?: number } = {}
): Promise<AirQualityModelResult> {
  // Reject invalid coordinates without clamping
  assertValidCoordinates(latitude, longitude);

  const pastDays = options.pastDays ?? 1;
  const forecastDays = options.forecastDays ?? 2;
  const cacheKey = `aq_model_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${pastDays}_${forecastDays}`;

  const cached = apiCache.get<AirQualityModelResult>(cacheKey);
  if (cached) return cached;

  const url = new URL(AIR_QUALITY_API_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set(
    'current',
    'pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide'
  );
  url.searchParams.set(
    'hourly',
    'pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide'
  );
  url.searchParams.set('past_days', pastDays.toString());
  url.searchParams.set('forecast_days', forecastDays.toString());
  url.searchParams.set('timezone', 'UTC');

  const raw = await fetchWithRetry<OpenMeteoAirQualityResponse>(url.toString(), {
    provider: 'Open-Meteo Air Quality (CAMS/SILAM)',
  });

  const fetchedAt = new Date().toISOString();
  const currentObsTime = raw.current?.time ? `${raw.current.time}:00Z` : fetchedAt;

  const mappings: { code: string; apiKey: keyof typeof raw.current }[] = [
    { code: 'pm25', apiKey: 'pm2_5' },
    { code: 'pm10', apiKey: 'pm10' },
    { code: 'no2', apiKey: 'nitrogen_dioxide' },
    { code: 'so2', apiKey: 'sulphur_dioxide' },
    { code: 'o3', apiKey: 'ozone' },
    { code: 'co', apiKey: 'carbon_monoxide' },
  ];

  const currentObservations: EnvironmentalObservation[] = [];
  const requestedCoordinates: GeoCoordinates = { latitude, longitude };
  const sourceCoordinates: GeoCoordinates = {
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevationMeters: raw.elevation,
  };

  for (const item of mappings) {
    const val = raw.current ? (raw.current[item.apiKey] as number) : null;
    const paramDef = getParameterByCode(item.code);
    const unit = raw.current_units?.[item.apiKey] || paramDef?.unit || 'µg/m³';
    const numericVal = typeof val === 'number' && !Number.isNaN(val) ? val : null;
    const qualityStatus = evaluateQualityStatus(numericVal, item.code);

    currentObservations.push({
      id: `om-aq-${item.code}-${raw.current?.time || Date.now()}`,
      sourceId: 'open-meteo-aq',
      sourceName: 'Open-Meteo Atmospheric Chemistry Model (CAMS/SILAM)',
      datasetOrModel: 'Copernicus CAMS & SILAM Chemistry Model',
      parameter: item.code,
      value: numericVal,
      unit,
      latitude: raw.latitude,
      longitude: raw.longitude,
      requestedCoordinates,
      sourceCoordinates,
      observedAt: currentObsTime,
      fetchedAt,
      timeStandard: 'UTC',
      modality: 'MODEL_DERIVED' as DataModality,
      qualityStatus,
      elevationMeters: raw.elevation,
    });
  }

  // Hourly datasets
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
      provider: 'Open-Meteo Air Quality (CAMS/SILAM)',
      datasetOrModel: 'Copernicus CAMS & SILAM Model (11km)',
      modality: 'MODEL_DERIVED',
      unit: raw.hourly_units?.[item.apiKey] || paramDef.unit,
      timeStandard: 'UTC',
      requestedCoordinates,
      sourceCoordinates,
      points,
    };
  }

  const result: AirQualityModelResult = {
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevationMeters: raw.elevation,
    requestedCoordinates,
    sourceCoordinates,
    timezone: raw.timezone,
    currentObservations,
    hourlyDatasets,
    rawResponse: raw,
    fetchedAt,
    isModelDerived: true,
  };

  apiCache.set(cacheKey, result, 300_000);
  return result;
}
