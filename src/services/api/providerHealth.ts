/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Provider Health & Ingestion Pipeline Prober
 * Validates genuine connectivity, measures live HTTP latency, and verifies actual payload schemas.
 * Distinguishes CONNECTED, DEGRADED, UNAVAILABLE, and NOT_CONFIGURED.
 * An HTTP 200 response alone does not establish integration—data payload validation is mandatory.
 */

import { fetchOpenMeteoWeather } from './openMeteoWeather';
import { fetchHistoricalReanalysis } from './openMeteoArchive';
import { fetchOpenMeteoAirQuality } from './openMeteoAirQuality';
import { fetchOpenAQStations } from './openAq';
import { fetchNasaPowerDaily } from './nasaPower';
import { ProviderHealth } from '../../types/environmental';

// Reference probe coordinate: London, UK (51.5074° N, 0.1278° W) — benchmark geographic coordinate
const PROBE_LAT = 51.5074;
const PROBE_LON = -0.1278;

export async function checkAllProvidersHealth(): Promise<Record<string, ProviderHealth>> {
  const results: Record<string, ProviderHealth> = {};

  // 1. Open-Meteo Weather API (/v1/forecast)
  try {
    const t0 = performance.now();
    const weather = await fetchOpenMeteoWeather(PROBE_LAT, PROBE_LON, { pastDays: 0, forecastDays: 1 });
    const latency = Math.round(performance.now() - t0);

    const verified = weather.currentObservations
      .filter((o) => typeof o.value === 'number' && !Number.isNaN(o.value))
      .map((o) => o.parameter);

    results['open-meteo'] = {
      sourceId: 'open-meteo',
      status: verified.length >= 4 ? 'CONNECTED' : verified.length > 0 ? 'DEGRADED' : 'UNAVAILABLE',
      latencyMs: latency,
      lastChecked: new Date().toISOString(),
      verifiedParameters: verified,
    };
  } catch (err: any) {
    results['open-meteo'] = {
      sourceId: 'open-meteo',
      status: 'UNAVAILABLE',
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
      verifiedParameters: [],
      errorMessage: err.message,
    };
  }

  // 2. Open-Meteo Historical Weather Archive (/v1/archive) - ERA5 reanalysis
  try {
    const t0 = performance.now();
    const archiveResult = await fetchHistoricalReanalysis(PROBE_LAT, PROBE_LON, {
      startDate: '2023-01-01',
      endDate: '2023-01-02',
      model: 'era5',
    });
    const latency = Math.round(performance.now() - t0);

    const verified = archiveResult.observations
      .filter((o) => typeof o.value === 'number' && !Number.isNaN(o.value))
      .map((o) => o.parameter);

    results['open-meteo-archive'] = {
      sourceId: 'open-meteo-archive',
      status: verified.length >= 4 ? 'CONNECTED' : verified.length > 0 ? 'DEGRADED' : 'UNAVAILABLE',
      latencyMs: latency,
      lastChecked: new Date().toISOString(),
      verifiedParameters: verified,
    };
  } catch (err: any) {
    results['open-meteo-archive'] = {
      sourceId: 'open-meteo-archive',
      status: 'UNAVAILABLE',
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
      verifiedParameters: [],
      errorMessage: err.message,
    };
  }

  // 3. Open-Meteo Air Quality API (/v1/air-quality)
  try {
    const t0 = performance.now();
    const aq = await fetchOpenMeteoAirQuality(PROBE_LAT, PROBE_LON, { pastDays: 0, forecastDays: 1 });
    const latency = Math.round(performance.now() - t0);

    const verified = aq.currentObservations
      .filter((o) => typeof o.value === 'number' && !Number.isNaN(o.value))
      .map((o) => o.parameter);

    results['open-meteo-aq'] = {
      sourceId: 'open-meteo-aq',
      status: verified.length >= 4 ? 'CONNECTED' : verified.length > 0 ? 'DEGRADED' : 'UNAVAILABLE',
      latencyMs: latency,
      lastChecked: new Date().toISOString(),
      verifiedParameters: verified,
    };
  } catch (err: any) {
    results['open-meteo-aq'] = {
      sourceId: 'open-meteo-aq',
      status: 'UNAVAILABLE',
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
      verifiedParameters: [],
      errorMessage: err.message,
    };
  }

  // 3. OpenAQ API v3 (Checks server key configuration first)
  try {
    const healthRes = await fetch('/api/health').catch(() => null);
    const healthJson = healthRes && healthRes.ok ? await healthRes.json().catch(() => null) : null;
    const hasKey = Boolean(healthJson?.hasOpenAqKey);

    if (!hasKey) {
      results['openaq'] = {
        sourceId: 'openaq',
        status: 'NOT_CONFIGURED',
        latencyMs: 0,
        lastChecked: new Date().toISOString(),
        verifiedParameters: [],
        errorMessage: 'OpenAQ API v3 key is not configured in server environment (OPENAQ_API_KEY).',
      };
    } else {
      const t0 = performance.now();
      const stations = await fetchOpenAQStations(PROBE_LAT, PROBE_LON, 40_000, 5);
      const latency = Math.round(performance.now() - t0);

      const allParams = new Set<string>();
      stations.forEach((s) => s.parametersMonitored.forEach((p) => allParams.add(p)));

      results['openaq'] = {
        sourceId: 'openaq',
        status: stations.length > 0 ? 'CONNECTED' : 'DEGRADED',
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
        verifiedParameters: Array.from(allParams),
      };
    }
  } catch (err: any) {
    const isUnconfigured = err.message?.includes('NOT_CONFIGURED') || err.status === 503;
    results['openaq'] = {
      sourceId: 'openaq',
      status: isUnconfigured ? 'NOT_CONFIGURED' : 'UNAVAILABLE',
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
      verifiedParameters: [],
      errorMessage: err.message,
    };
  }

  // 4. NASA POWER API (Actual Live Probe — No Hardcoding)
  try {
    const t0 = performance.now();
    const nasaResult = await fetchNasaPowerDaily(PROBE_LAT, PROBE_LON);
    const latency = Math.round(performance.now() - t0);

    const verified = nasaResult.observations
      .filter((o) => typeof o.value === 'number' && !Number.isNaN(o.value) && o.value > -990)
      .map((o) => o.parameter);

    results['nasa-power'] = {
      sourceId: 'nasa-power',
      status: verified.length > 0 ? 'CONNECTED' : 'DEGRADED',
      latencyMs: latency,
      lastChecked: new Date().toISOString(),
      verifiedParameters: verified,
    };
  } catch (err: any) {
    results['nasa-power'] = {
      sourceId: 'nasa-power',
      status: 'UNAVAILABLE',
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
      verifiedParameters: [],
      errorMessage: err.message,
    };
  }

  // 5. Copernicus Climate Data Store (CDS)
  // Not integrated in Phase 2 — strictly report as NOT_CONFIGURED without fabricating latency or metrics
  results['copernicus-cds'] = {
    sourceId: 'copernicus-cds',
    status: 'NOT_CONFIGURED',
    latencyMs: 0,
    lastChecked: new Date().toISOString(),
    verifiedParameters: [],
    errorMessage: 'Copernicus CDS API token and NetCDF reanalysis worker pipeline pending Phase 3.',
  };

  return results;
}
