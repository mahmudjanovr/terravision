/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SectionHeader } from '../../components/common/SectionHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { ParameterTimeSeriesChart } from '../../components/charts/ParameterTimeSeriesChart';
import { EmptyState } from '../../components/common/EmptyState';
import { getParametersByCategory } from '../../utils/parameters';
import { EnvironmentalParameter } from '../../types/environmental';
import {
  useEnvironmentalData,
  GLOBAL_LOCATION_PRESETS,
} from '../../hooks/useEnvironmentalData';
import {
  Wind,
  MapPin,
  ShieldCheck,
  Radio,
  Layers,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface AirQualityPageProps {
  onNavigateToSources: () => void;
}

export const AirQualityPage: React.FC<AirQualityPageProps> = ({ onNavigateToSources }) => {
  const aqParameters = getParametersByCategory('air_quality');
  const [selectedParameterCode, setSelectedParameterCode] = useState<string>('pm25');

  const {
    selectedLocation,
    airQualityData,
    stations,
    selectedStation,
    stationObservations,
    isLoading,
    errors,
    changeLocation,
    selectStation,
    refreshAll,
  } = useEnvironmentalData();

  const activeParameter: EnvironmentalParameter =
    aqParameters.find((p) => p.code === selectedParameterCode) || aqParameters[0];

  const currentModelObs = airQualityData?.currentObservations || [];
  const activeDataset = airQualityData?.hourlyDatasets[selectedParameterCode];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <SectionHeader
        title="Air Quality Telemetry"
        subtitle="Criteria air pollutants monitored through atmospheric chemistry models (CAMS) and terrestrial ground sensor networks (OpenAQ)."
        badge="Phase 2 Ingestion Active"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Location:</span>
              <select
                value={selectedLocation.name}
                onChange={(e) => {
                  const loc = GLOBAL_LOCATION_PRESETS.find((l) => l.name === e.target.value);
                  if (loc) changeLocation(loc);
                }}
                className="bg-transparent focus:outline-none cursor-pointer text-cyan-300 font-bold pr-1"
                aria-label="Filter geographic location"
              >
                {GLOBAL_LOCATION_PRESETS.map((loc) => (
                  <option key={loc.name} value={loc.name} className="bg-slate-900">
                    {loc.name}, {loc.country}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={refreshAll}
              disabled={isLoading}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Real Data Integrity Notice Banner */}
      <div className="p-4 bg-[#0a0f1d] border border-cyan-900/40 rounded-lg flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-100">Modality Distinction & AQI Policy: </span>
          The cards below display real atmospheric chemical model observations retrieved live from Open-Meteo Air Quality
          (CAMS global 11 km grid). These values are tagged as <span className="font-mono text-cyan-400 font-semibold">MODEL_DERIVED</span>.
          Separate ground sensor stations (OpenAQ) are displayed below. Unverified AQI indexes are never hallucinated.
        </div>
      </div>

      {/* Criteria Pollutants Selector Grid (Live Model Values) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Atmospheric Chemistry Model Ingestion (Open-Meteo / CAMS)</span>
          </span>
          <span className="text-emerald-400">● LIVE FEED</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {aqParameters.map((param) => {
            const obs = currentModelObs.find((o) => o.parameter === param.code);
            return (
              <MetricCard
                key={param.code}
                parameter={param}
                currentValue={obs?.value}
                observedAt={obs?.observedAt}
                sourceName="Open-Meteo (CAMS)"
                modality="MODEL_DERIVED"
                loading={isLoading && !obs}
                selected={selectedParameterCode === param.code}
                onClick={() => setSelectedParameterCode(param.code)}
              />
            );
          })}
        </div>
      </div>

      {/* Detailed Parameter Context Card */}
      <div className="p-4 bg-[#0c1019] border border-slate-800/80 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-500">ACTIVE INDICATOR:</span>{' '}
          <span className="text-cyan-400 font-bold">{activeParameter.name}</span>{' '}
          <span className="text-slate-400">({activeParameter.chemicalFormula})</span>
          <div className="text-slate-400 font-sans mt-0.5">
            {activeParameter.description} · Standard: {activeParameter.standardReference}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-slate-500">
            UNIT: <span className="text-slate-200">{activeParameter.unit}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="text-slate-500">
            MODALITY: <span className="text-cyan-400">MODEL_DERIVED</span>
          </div>
        </div>
      </div>

      {/* Time-Series Chart Container (Real Ingested Points) */}
      <ParameterTimeSeriesChart
        parameter={activeParameter}
        dataset={activeDataset}
        sourceName="Open-Meteo CAMS Model Grid"
      />

      {/* Ground Monitoring Stations Section (OpenAQ v3) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Terrestrial Ground Monitoring Stations (OpenAQ Network)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {stations.length > 0 ? `${stations.length} Stations Found` : 'Provider Connection Status'}
          </span>
        </div>

        {stations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Station List */}
            <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-3 space-y-2 max-h-72 overflow-y-auto">
              {stations.map((stn) => (
                <div
                  key={stn.id}
                  onClick={() => selectStation(stn)}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                    selectedStation?.id === stn.id
                      ? 'bg-slate-900 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-100 truncate">{stn.name}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {stn.operator || 'Ground Sensor'} · {stn.location.latitude.toFixed(2)}°, {stn.location.longitude.toFixed(2)}°
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {stn.parametersMonitored.slice(0, 4).map((p) => (
                      <span key={p} className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.2 rounded text-slate-400">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Station Telemetry */}
            <div className="lg:col-span-2 border border-slate-800/80 bg-[#0b0f19] rounded-lg p-4 space-y-3">
              {selectedStation ? (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-mono text-cyan-400 font-semibold">
                        GROUND STATION: {selectedStation.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedStation.operator || 'Official Network'} · Last Report: {selectedStation.lastReportedAt || 'Recent'}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      GROUND_OBSERVATION
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                    {stationObservations.length > 0 ? (
                      stationObservations.map((obs) => (
                        <div key={obs.id} className="p-3 bg-slate-900/60 rounded border border-slate-800">
                          <div className="text-[10px] font-mono text-slate-400 uppercase">{obs.parameter}</div>
                          <div className="text-lg font-bold font-mono text-slate-100 mt-1">
                            {obs.value !== null ? obs.value.toFixed(1) : '--'}{' '}
                            <span className="text-xs font-normal text-slate-400">{obs.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            {new Date(obs.observedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-6 text-xs text-slate-400 font-mono">
                        Awaiting sensor stream for this specific location.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyState
            title="OpenAQ Ground Stations Stream"
            description={
              errors['openaq']?.includes('NOT_CONFIGURED') || errors['openaq']?.includes('401') || errors['openaq']?.includes('key')
                ? 'OpenAQ API v3 requires an authentication key configured in the server environment (OPENAQ_API_KEY). Ground sensors are kept offline to prevent unauthorized requests, while model-derived data remains fully active above.'
                : 'No nearby terrestrial sensor stations reported within 60 km radius of this coordinate in the OpenAQ registry. Model-derived data above remains active.'
            }
            sourceTarget="OpenAQ Global Monitoring Registry"
            suggestedAction={{
              label: 'Inspect Data Source Registry',
              onClick: onNavigateToSources,
              icon: 'database',
            }}
            compact={true}
          />
        )}
      </div>
    </div>
  );
};
