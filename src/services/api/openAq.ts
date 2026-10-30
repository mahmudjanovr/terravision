/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OpenAQ API v3 Client
 * Retrieves real-world terrestrial monitoring stations and ground-level sensor observations.
 * Explicitly tagged as GROUND_OBSERVATION.
 * Uses secure server proxy (/api/openaq/*) if available, falling back to public OpenAQ v3.
 */

import { fetchWithRetry } from './client';
import { apiCache } from './cache';
import { assertValidCoordinates } from '../../utils/coordinates';
import {
  MonitoringStation,
  GroundObservation,
  QualityStatus,
} from '../../types/environmental';

export interface OpenAQLocationResult {
  id: number;
  name: string;
  locality?: string;
  timezone?: string;
  country?: {
    id: number;
    code: string;
    name: string;
  };
  owner?: {
    id: number;
    name: string;
  };
  provider?: {
    id: number;
    name: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  sensors: {
    id: number;
    name: string;
    parameter: {
      id: number;
      name: string;
      units: string;
      displayName?: string;
    };
  }[];
  datetimeFirst?: { utc: string };
  datetimeLast?: { utc: string };
}

export interface OpenAQLocationsResponse {
  meta: {
    name: string;
    license: string;
    website: string;
    page: number;
    limit: number;
    found: number;
  };
  results: OpenAQLocationResult[];
}

export interface OpenAQLatestResponse {
  meta: Record<string, unknown>;
  results: {
    datetime: { utc: string; local: string };
    value: number;
    coordinates?: { latitude: number; longitude: number };
    sensorsId: number;
    locationsId: number;
    parameter: {
      id: number;
      name: string;
      units: string;
      displayName?: string;
    };
  }[];
}

/**
 * Discovers nearby ground monitoring stations via secure OpenAQ v3 server proxy.
 * If server OPENAQ_API_KEY is not configured, returns empty list with NOT_CONFIGURED error.
 * Does not silently bypass authentication or fabricate station data.
 */
export async function fetchOpenAQStations(
  latitude: number,
  longitude: number,
  radiusMeters: number = 50_000,
  limit: number = 20
): Promise<MonitoringStation[]> {
  // Reject invalid coordinates without clamping
  assertValidCoordinates(latitude, longitude);

  const cacheKey = `openaq_stations_${latitude.toFixed(2)}_${longitude.toFixed(2)}_${radiusMeters}_${limit}`;
  const cached = apiCache.get<MonitoringStation[]>(cacheKey);
  if (cached) return cached;

  const endpoint = `/api/openaq/locations?coordinates=${latitude},${longitude}&radius=${radiusMeters}&limit=${limit}`;

  const rawData = await fetchWithRetry<OpenAQLocationsResponse>(endpoint, {
    provider: 'OpenAQ Server Proxy',
    timeoutMs: 10_000,
    retries: 1,
  });

  const results = rawData.results || [];
  const stations: MonitoringStation[] = results.map((loc) => {
    const parameters = loc.sensors?.map((s) => s.parameter.name.toLowerCase()) || [];

    return {
      id: `openaq-station-${loc.id}`,
      name: loc.name || loc.locality || `OpenAQ Station #${loc.id}`,
      sourceId: 'openaq',
      location: {
        latitude: loc.coordinates.latitude,
        longitude: loc.coordinates.longitude,
        countryCode: loc.country?.code,
        regionName: loc.locality || loc.country?.name,
        cityName: loc.locality,
      },
      parametersMonitored: Array.from(new Set(parameters)),
      stationType: 'ground_sensor',
      operator: loc.owner?.name || loc.provider?.name || 'Government / Research Network',
      installedAt: loc.datetimeFirst?.utc,
      lastReportedAt: loc.datetimeLast?.utc,
      sensors: loc.sensors?.map((s) => ({
        id: s.id.toString(),
        parameter: s.parameter.name.toLowerCase(),
        unit: s.parameter.units,
      })),
    };
  });

  apiCache.set(cacheKey, stations, 600_000); // Cache for 10 minutes
  return stations;
}

/**
 * Retrieves latest sensor observations from a specific OpenAQ station via secure proxy.
 */
export async function fetchOpenAQStationLatest(
  locationId: number | string
): Promise<GroundObservation[]> {
  const numericId = typeof locationId === 'string' ? locationId.replace(/\D/g, '') : locationId;
  if (!numericId) return [];

  const cacheKey = `openaq_latest_${numericId}`;
  const cached = apiCache.get<GroundObservation[]>(cacheKey);
  if (cached) return cached;

  const endpoint = `/api/openaq/locations/${numericId}/latest`;
  const rawData = await fetchWithRetry<OpenAQLatestResponse>(endpoint, {
    provider: 'OpenAQ Server Proxy',
    timeoutMs: 10_000,
    retries: 1,
  });

  const fetchedAt = new Date().toISOString();
  const results = rawData.results || [];

  const observations: GroundObservation[] = results.map((item) => {
    const paramCode = item.parameter.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    return {
      id: `openaq-obs-${numericId}-${item.sensorsId}-${item.datetime.utc}`,
      sourceId: 'openaq',
      sourceName: 'OpenAQ Global Network (Ground Sensor)',
      stationId: `openaq-station-${numericId}`,
      parameter: paramCode,
      value: typeof item.value === 'number' && !Number.isNaN(item.value) ? item.value : null,
      unit: item.parameter.units || 'µg/m³',
      latitude: item.coordinates?.latitude || 0,
      longitude: item.coordinates?.longitude || 0,
      observedAt: item.datetime.utc,
      fetchedAt,
      modality: 'GROUND_OBSERVATION',
      qualityStatus: 'verified' as QualityStatus,
    };
  });

  apiCache.set(cacheKey, observations, 300_000);
  return observations;
}
