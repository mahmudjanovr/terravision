/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NASA POWER API Integration Client
 * Retrieves satellite-derived solar irradiance and agroclimatological reanalysis data.
 * Explicitly tagged as SATELLITE_OBSERVATION / REANALYSIS.
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

export interface NasaPowerDailyResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
  properties: {
    parameter: {
      ALLSKY_SFC_SW_DWN?: Record<string, number>; // kW-hr/m^2/day
      T2M?: Record<string, number>;              // °C
      RH2M?: Record<string, number>;             // %
      PRECTOTCORR?: Record<string, number>;      // mm/day
      WS10M?: Record<string, number>;            // m/s
      PS?: Record<string, number>;               // kPa
    };
  };
  header: {
    title: string;
    api_version?: string;
    sources: string[];
    fill_value: number; // e.g. -999.0
    time_standard?: string; // e.g. "LST"
  };
  messages: string[];
  parameters: Record<string, { units: string; longname: string }>;
}

export interface NasaPowerResult {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  requestedCoordinates: GeoCoordinates;
  sourceCoordinates: GeoCoordinates;
  observations: EnvironmentalObservation[];
  datasets: Record<string, TimeSeriesDataset>;
  fetchedAt: string;
  sourceHeader: string;
  timeStandard: 'UTC' | 'LST' | string;
}

const NASA_POWER_API_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';

export async function fetchNasaPowerDaily(
  latitude: number,
  longitude: number,
  startDate?: string,
  endDate?: string,
  timeStandard: 'UTC' | 'LST' = 'UTC'
): Promise<NasaPowerResult> {
  // Reject invalid coordinates without clamping
  assertValidCoordinates(latitude, longitude);

  // Format default dates: past 30 days to 3 days ago (NASA POWER has ~2-day latency)
  const today = new Date();
  const defaultEnd = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const defaultStart = new Date(defaultEnd.getTime() - 28 * 24 * 60 * 60 * 1000);

  const formatYMD = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
      d.getUTCDate()
    ).padStart(2, '0')}`;

  const start = startDate ? startDate.replace(/-/g, '') : formatYMD(defaultStart);
  const end = endDate ? endDate.replace(/-/g, '') : formatYMD(defaultEnd);

  const cacheKey = `nasa_power_${latitude.toFixed(2)}_${longitude.toFixed(2)}_${start}_${end}_${timeStandard}`;
  const cached = apiCache.get<NasaPowerResult>(cacheKey);
  if (cached) return cached;

  const url = new URL(NASA_POWER_API_URL);
  url.searchParams.set('latitude', latitude.toFixed(4));
  url.searchParams.set('longitude', longitude.toFixed(4));
  url.searchParams.set('start', start);
  url.searchParams.set('end', end);
  url.searchParams.set('community', 'RE'); // Renewable Energy
  url.searchParams.set('parameters', 'ALLSKY_SFC_SW_DWN,T2M,RH2M,PRECTOTCORR,WS10M,PS');
  url.searchParams.set('time-standard', timeStandard);
  url.searchParams.set('format', 'JSON');

  const raw = await fetchWithRetry<NasaPowerDailyResponse>(url.toString(), {
    provider: 'NASA POWER Climatology',
    timeoutMs: 15_000,
    retries: 1,
  });

  const fetchedAt = new Date().toISOString();
  const fillValue = raw.header?.fill_value ?? -999;
  const returnedTimeStandard: 'UTC' | 'LST' = (raw.header?.time_standard as 'UTC' | 'LST') || timeStandard;
  const paramData = raw.properties?.parameter || {};

  /**
   * Scientific Modality Differentiation:
   * - Solar radiation (ALLSKY_SFC_SW_DWN) is derived from satellite radiometry (CERES / SYN1DEG).
   * - Meteorological parameters (T2M, RH2M, PRECTOTCORR, WS10M, PS) originate from GMAO MERRA-2 atmospheric assimilation.
   * They must NOT all be blindly tagged as satellite observations.
   */
  const paramMappings: {
    nasaCode: keyof typeof paramData;
    ourCode: string;
    unit: string;
    modality: DataModality;
    provenanceName: string;
  }[] = [
    {
      nasaCode: 'ALLSKY_SFC_SW_DWN',
      ourCode: 'solar_radiation',
      unit: 'kW-hr/m²/day',
      modality: 'SATELLITE_OBSERVATION',
      provenanceName: 'NASA CERES / SYN1DEG Satellite Solar Irradiance',
    },
    {
      nasaCode: 'T2M',
      ourCode: 'temperature_2m',
      unit: '°C',
      modality: 'REANALYSIS',
      provenanceName: 'NASA GMAO MERRA-2 Atmospheric Reanalysis',
    },
    {
      nasaCode: 'RH2M',
      ourCode: 'relative_humidity',
      unit: '%',
      modality: 'REANALYSIS',
      provenanceName: 'NASA GMAO MERRA-2 Atmospheric Reanalysis',
    },
    {
      nasaCode: 'PRECTOTCORR',
      ourCode: 'precipitation',
      unit: 'mm/day',
      modality: 'REANALYSIS',
      provenanceName: 'NASA GMAO MERRA-2 Atmospheric Reanalysis',
    },
    {
      nasaCode: 'WS10M',
      ourCode: 'wind_speed_10m',
      unit: 'm/s',
      modality: 'REANALYSIS',
      provenanceName: 'NASA GMAO MERRA-2 Atmospheric Reanalysis',
    },
  ];

  const observations: EnvironmentalObservation[] = [];
  const datasets: Record<string, TimeSeriesDataset> = {};

  const isMissingValue = (v: number | undefined | null): boolean => {
    if (v === undefined || v === null || Number.isNaN(v)) return true;
    if (v === fillValue || v <= -990) return true;
    return false;
  };

  for (const item of paramMappings) {
    const records = paramData[item.nasaCode] || {};
    const dateKeys = Object.keys(records).sort();
    if (dateKeys.length === 0) continue;

    const paramDef = getParameterByCode(item.ourCode);

    // Build TimeSeries points, keeping missing values as null (NO zero-substitution)
    // CRITICAL: Never label Local Solar Time (LST) timestamps as UTC (no trailing 'Z')
    const points = dateKeys.map((dk) => {
      const year = dk.slice(0, 4);
      const month = dk.slice(4, 6);
      const day = dk.slice(6, 8);
      const formattedTimestamp =
        returnedTimeStandard === 'UTC'
          ? `${year}-${month}-${day}T00:00:00Z`
          : `${year}-${month}-${day}T00:00:00`; // LST has no 'Z'

      const val = records[dk];
      return {
        timestamp: formattedTimestamp,
        value: isMissingValue(val) ? null : val,
        isForecast: false,
        timeStandard: returnedTimeStandard,
      };
    });

    const requestedCoordinates: GeoCoordinates = { latitude, longitude };
    const sourceCoordinates: GeoCoordinates = {
      latitude: raw.geometry?.coordinates?.[1] ?? latitude,
      longitude: raw.geometry?.coordinates?.[0] ?? longitude,
      elevationMeters: raw.geometry?.coordinates?.[2],
    };

    if (paramDef) {
      datasets[item.ourCode] = {
        parameter: paramDef,
        provider: item.provenanceName,
        datasetOrModel: item.provenanceName,
        modality: item.modality,
        unit: item.unit,
        timeStandard: returnedTimeStandard,
        requestedCoordinates,
        sourceCoordinates,
        points,
      };
    }

    // Search backwards for the most recent valid observation
    let validDateKey: string | null = null;
    let validValue: number | null = null;

    for (let i = dateKeys.length - 1; i >= 0; i--) {
      const dk = dateKeys[i];
      const val = records[dk];
      if (!isMissingValue(val)) {
        validDateKey = dk;
        validValue = val;
        break;
      }
    }

    if (validDateKey && validValue !== null) {
      const year = validDateKey.slice(0, 4);
      const month = validDateKey.slice(4, 6);
      const day = validDateKey.slice(6, 8);
      const observedTimestamp =
        returnedTimeStandard === 'UTC'
          ? `${year}-${month}-${day}T00:00:00Z`
          : `${year}-${month}-${day}T00:00:00`; // LST must never be labeled as UTC

      const qualityStatus = evaluateQualityStatus(validValue, item.ourCode);

      observations.push({
        id: `nasa-${item.ourCode}-${validDateKey}-${returnedTimeStandard.toLowerCase()}`,
        sourceId: 'nasa-power',
        sourceName: item.provenanceName,
        datasetOrModel: item.provenanceName,
        parameter: item.ourCode,
        value: validValue,
        unit: item.unit,
        latitude: raw.geometry?.coordinates?.[1] ?? latitude,
        longitude: raw.geometry?.coordinates?.[0] ?? longitude,
        requestedCoordinates,
        sourceCoordinates,
        observedAt: observedTimestamp,
        fetchedAt,
        timeStandard: returnedTimeStandard,
        modality: item.modality,
        qualityStatus,
      });
    }
  }

  const requestedCoordinates: GeoCoordinates = { latitude, longitude };
  const sourceCoordinates: GeoCoordinates = {
    latitude: raw.geometry?.coordinates?.[1] ?? latitude,
    longitude: raw.geometry?.coordinates?.[0] ?? longitude,
    elevationMeters: raw.geometry?.coordinates?.[2],
  };

  const result: NasaPowerResult = {
    latitude: raw.geometry?.coordinates?.[1] ?? latitude,
    longitude: raw.geometry?.coordinates?.[0] ?? longitude,
    elevationMeters: raw.geometry?.coordinates?.[2],
    requestedCoordinates,
    sourceCoordinates,
    observations,
    datasets,
    fetchedAt,
    sourceHeader: raw.header?.title || 'NASA POWER Climatology',
    timeStandard: returnedTimeStandard,
  };

  apiCache.set(cacheKey, result, 3600_000); // Cache for 1 hour
  return result;
}
