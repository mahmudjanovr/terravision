/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageId } from '../../types/navigation';
import { APP_CONFIG } from '../../config/appConfig';
import { DATA_SOURCES } from '../../config/dataSources';
import { STANDARD_PARAMETERS } from '../../utils/parameters';
import { SectionHeader } from '../../components/common/SectionHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { MapLibreViewer } from '../../components/maps/MapLibreViewer';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  useEnvironmentalData,
  GLOBAL_LOCATION_PRESETS,
  LocationPreset,
} from '../../hooks/useEnvironmentalData';
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Database,
  Compass,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const {
    selectedLocation,
    weatherData,
    airQualityData,
    stations,
    isLoading,
    lastRefreshedAt,
    changeLocation,
    refreshAll,
  } = useEnvironmentalData();

  // Combine observations from weather and air quality models
  const allCurrentObs = [
    ...(weatherData?.currentObservations || []),
    ...(airQualityData?.currentObservations || []),
  ];

  const featuredParameters = STANDARD_PARAMETERS.filter((p) =>
    ['pm25', 'no2', 'temperature_2m', 'relative_humidity', 'precipitation', 'surface_pressure'].includes(
      p.code
    )
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Editorial Mission Hero */}
      <div className="border border-slate-800/80 bg-[#090d16] rounded-xl p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PHASE 2 LIVE INGESTION · GLOBAL COVERAGE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
              Global Environmental Intelligence Platform
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              TERRAVISION monitors real-world atmospheric chemistry, air quality, and climate indicators
              across the planet. Integrated with Open-Meteo, OpenAQ, and NASA POWER to stream authenticated,
              unfabricated earth observations.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Global Map</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sources')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Inspect Data Sources ({DATA_SOURCES.length})</span>
            </button>
          </div>
        </div>

        {/* Global Observation Hub Selector */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Observation Hub:</span>
            <select
              value={selectedLocation.name}
              onChange={(e) => {
                const loc = GLOBAL_LOCATION_PRESETS.find((l) => l.name === e.target.value);
                if (loc) changeLocation(loc);
              }}
              className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold px-2.5 py-1 rounded focus:outline-none cursor-pointer"
            >
              {GLOBAL_LOCATION_PRESETS.map((loc) => (
                <option key={loc.name} value={loc.name} className="bg-slate-900 text-slate-200">
                  {loc.name}, {loc.country} ({loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              {lastRefreshedAt ? `Synced ${new Date(lastRefreshedAt).toLocaleTimeString()}` : 'Syncing...'}
            </span>
            <button
              type="button"
              onClick={refreshAll}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded cursor-pointer"
              title="Refresh live observation feeds"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Data Provenance Notices */}
        <div className="mt-5 pt-4 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">Zero Fabricated Readings</div>
              <div className="text-slate-400 mt-0.5">
                Every measurement reflects raw model telemetry or sensor readings directly from external APIs.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">Multi-Modal Classification</div>
              <div className="text-slate-400 mt-0.5">
                Clearly separates atmospheric model predictions (CAMS) from physical weather reanalysis.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Activity className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">Phase 2 Verification</div>
              <div className="text-slate-400 mt-0.5">
                Open-Meteo & NASA POWER actively ingested. OpenAQ connected with authentic rate limits.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Indicator Grid with Genuine Live Data */}
      <section className="space-y-4">
        <SectionHeader
          title={`Live Environmental Telemetry: ${selectedLocation.name}`}
          subtitle={`Real-world atmospheric variables retrieved for ${selectedLocation.latitude}° N, ${selectedLocation.longitude}° E.`}
          badge="Live Ingestion Active"
          actions={
            <button
              type="button"
              onClick={() => onNavigate('air-quality')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              <span>Air Quality Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredParameters.map((param) => {
            const obs = allCurrentObs.find((o) => o.parameter === param.code);
            return (
              <MetricCard
                key={param.code}
                parameter={param}
                currentValue={obs?.value}
                observedAt={obs?.observedAt}
                sourceName={obs?.sourceName}
                modality={obs?.modality}
                loading={isLoading && !obs}
                onClick={() =>
                  onNavigate(param.category === 'air_quality' ? 'air-quality' : 'climate')
                }
              />
            );
          })}
        </div>
      </section>

      {/* Global Interactive Map Section with Target Center */}
      <section className="space-y-4">
        <SectionHeader
          title="Geospatial Intelligence Viewport"
          subtitle={`Interactive MapLibre GL engine centered on ${selectedLocation.name} with coordinate probe.`}
          actions={
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              <span>Full Screen Viewport</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        />

        <div className="h-[460px] w-full rounded-lg overflow-hidden border border-slate-800">
          <MapLibreViewer
            showControls={true}
            showLayerPanel={true}
            stations={stations}
            targetCenter={[selectedLocation.longitude, selectedLocation.latitude]}
          />
        </div>
      </section>

      {/* Data Source Registry Summary & Live Pipeline Readiness */}
      <section className="space-y-4">
        <SectionHeader
          title="Data Provider Readiness & Modality Matrix"
          subtitle="Real-world data ingestion status mapped across international scientific data providers."
          actions={
            <button
              type="button"
              onClick={() => onNavigate('sources')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              <span>Manage Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        />

        <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-800/60">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono text-cyan-400 font-semibold shrink-0">
                    {source.shortCode.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-200">{source.name}</h4>
                      <span className="text-[11px] font-mono text-cyan-400/90 hidden md:inline">
                        [{source.modality}]
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {source.coverage} · {source.spatialResolution}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <StatusBadge status={source.integrationStatus} size="sm" />
                  <a
                    href={source.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors"
                  >
                    Docs ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Navigation Shortcuts Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div
          onClick={() => onNavigate('air-quality')}
          className="p-5 border border-slate-800/80 bg-[#0b0f19] rounded-lg hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="text-xs font-mono text-cyan-400 mb-1">MODULE 01</div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
            Air Quality Telemetry
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Examine criteria air pollutants, distinguish model forecasts from ground sensors, and view real CAMS series.
          </p>
        </div>

        <div
          onClick={() => onNavigate('climate')}
          className="p-5 border border-slate-800/80 bg-[#0b0f19] rounded-lg hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="text-xs font-mono text-cyan-400 mb-1">MODULE 02</div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
            Atmospheric & Climate
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Surface temperature, wind velocity, humidity, and barometric pressure time-series with NASA solar radiation.
          </p>
        </div>

        <div
          onClick={() => onNavigate('research')}
          className="p-5 border border-slate-800/80 bg-[#0b0f19] rounded-lg hover:border-slate-700 transition-colors cursor-pointer group"
        >
          <div className="text-xs font-mono text-cyan-400 mb-1">MODULE 03</div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
            Research Explorer
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Execute precision coordinate queries, fetch real meteorological datasets, and download genuine CSV archives.
          </p>
        </div>
      </section>
    </div>
  );
};
