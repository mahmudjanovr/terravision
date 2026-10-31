/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TERRAVISION Environmental Data Contracts
 * Strict type definitions for real observations, data providers, parameters, and spatial entities.
 * Phase 2 extends this with explicit data modalities and provider-independent models.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
}

export type QualityStatus = 
  | 'VALIDATED'
  | 'UNVERIFIED'
  | 'SUSPECT'
  | 'MISSING'
  | 'INVALID'
  | 'verified'
  | 'unverified'
  | 'preliminary'
  | 'sensor_maintenance'
  | 'anomalous_flagged';

export type IntegrationStatus = 
  | 'CONNECTED'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'NOT_CONFIGURED'
  | 'connected'
  | 'degraded'
  | 'offline'
  | 'in_development'
  | 'not_integrated';

export type DataModality = 
  | 'GROUND_OBSERVATION'
  | 'MODEL_DERIVED'
  | 'SATELLITE_OBSERVATION'
  | 'REANALYSIS'
  | 'FORECAST';

export type ParameterCategory = 
  | 'air_quality'
  | 'climate'
  | 'radiation'
  | 'atmospheric';

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  countryCode?: string;
  regionName?: string;
  cityName?: string;
  elevationMeters?: number;
}

export interface MonitoringStation {
  id: string;
  name: string;
  sourceId: string;
  location: GeographicLocation;
  parametersMonitored: string[];
  stationType: 'ground_sensor' | 'satellite_swath' | 'reanalysis_grid' | 'weather_station';
  operator?: string;
  installedAt?: string;
  lastReportedAt?: string;
  sensors?: {
    id: string;
    parameter: string;
    unit: string;
    latestValue?: number | null;
    lastUpdated?: string;
  }[];
}

export interface EnvironmentalParameter {
  code: string;
  name: string;
  chemicalFormula?: string;
  unit: string;
  category: ParameterCategory;
  description: string;
  standardReference?: string;
  precisionDecimals: number;
}

export interface EnvironmentalObservation {
  id: string;
  sourceId: string;
  sourceName?: string;
  stationId?: string;
  stationName?: string;
  locationId?: string;
  parameter: string;
  value: number | null;
  unit: string;
  latitude: number;
  longitude: number;
  requestedCoordinates?: GeoCoordinates;
  sourceCoordinates?: GeoCoordinates | null;
  observedAt: string; // ISO 8601 UTC
  fetchedAt: string;  // ISO 8601 UTC
  modality: DataModality;
  qualityStatus: QualityStatus;
  timeStandard?: 'UTC' | 'LST' | string;
  datasetOrModel?: string;
  isForecast?: boolean;
  elevationMeters?: number;
  rawPayload?: Record<string, unknown>;
}

export interface GroundObservation extends EnvironmentalObservation {
  modality: 'GROUND_OBSERVATION';
  stationId: string;
}

export interface ModelDerivedObservation extends EnvironmentalObservation {
  modality: 'MODEL_DERIVED';
  modelResolutionKm?: number;
}

export interface ForecastObservation extends EnvironmentalObservation {
  modality: 'FORECAST';
  isForecast: true;
  forecastHorizonHours?: number;
}

export interface ReanalysisRecord extends EnvironmentalObservation {
  modality: 'REANALYSIS';
  reanalysisModelName?: string;
}

export interface DataSource {
  id: string;
  name: string;
  shortCode: string;
  category: string;
  organization: string;
  description: string;
  coverage: string;
  spatialResolution: string;
  temporalResolution: string;
  documentationUrl: string;
  apiEndpointUrl?: string;
  integrationStatus: IntegrationStatus;
  modality: DataModality;
  lastSuccessfulSync: string | null;
  supportedParameters: string[];
  licensing: string;
  syncMethod: 'REST' | 'WMS/WMTS' | 'OpenSearch' | 'NetCDF/Zarr';
  latencyMs?: number;
  errorMessage?: string;
}

export interface ProviderHealth {
  sourceId: string;
  status: IntegrationStatus;
  latencyMs: number;
  lastChecked: string;
  verifiedParameters: string[];
  errorMessage?: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number | null;
  isForecast?: boolean;
  timeStandard?: 'UTC' | 'LST' | string;
}

export interface TimeSeriesDataset {
  parameter: EnvironmentalParameter;
  provider: string;
  datasetOrModel?: string;
  modality: DataModality;
  unit: string;
  timeStandard?: 'UTC' | 'LST' | string;
  requestedCoordinates?: GeoCoordinates;
  sourceCoordinates?: GeoCoordinates | null;
  points: TimeSeriesPoint[];
}

export interface ResearchQueryFilter {
  geographicScope: 'global' | 'custom_bbox' | 'coordinates';
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  parameters: string[];
  startDate?: string;
  endDate?: string;
  sources: string[];
  qualityFilter?: QualityStatus[];
}
