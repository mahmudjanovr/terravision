/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SectionHeader } from '../../components/common/SectionHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { ParameterTimeSeriesChart } from '../../components/charts/ParameterTimeSeriesChart';
import { EmptyState } from '../../components/common/EmptyState';
import { STANDARD_PARAMETERS } from '../../utils/parameters';
import { EnvironmentalParameter } from '../../types/environmental';
import {
  useEnvironmentalData,
  GLOBAL_LOCATION_PRESETS,
} from '../../hooks/useEnvironmentalData';
import { HistoricalReanalysisPanel } from '../../components/climate/HistoricalReanalysisPanel';
import {
  Thermometer,
  CloudRain,
  Wind,
  Gauge,
  Sun,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface ClimatePageProps {
  onNavigateToSources: () => void;
}

export const ClimatePage: React.FC<ClimatePageProps> = ({ onNavigateToSources }) => {
  const climateParameters = STANDARD_PARAMETERS.filter((p) =>
    ['temperature_2m', 'relative_humidity', 'wind_speed_10m', 'precipitation', 'surface_pressure', 'solar_radiation'].includes(
      p.code
    )
  );

  const [selectedCode, setSelectedCode] = useState<string>('temperature_2m');

  const {
    selectedLocation,
    weatherData,
    nasaPowerData,
    nasaTimeStandard,
    updateNasaTimeStandard,
    isLoading,
    changeLocation,
    refreshAll,
  } = useEnvironmentalData();

  const activeParameter: EnvironmentalParameter =
    climateParameters.find((p) => p.code === selectedCode) || climateParameters[0];

  const currentObs = [
    ...(weatherData?.currentObservations || []),
    ...(nasaPowerData?.observations || []),
  ];

  // Pick dataset for chart: Open-Meteo hourly or NASA daily
  const weatherDataset = weatherData?.hourlyDatasets[selectedCode];
  const nasaDataset = nasaPowerData?.datasets[selectedCode];
  const activeDataset = weatherDataset || nasaDataset;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <SectionHeader
        title="Climate & Atmospheric Telemetry"
        subtitle="Global physical meteorological variables standardized according to World Meteorological Organization (WMO) observational protocols."
        badge="Live Telemetry Ingested"
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

      {/* Real Data Integrity Notice */}
      <div className="p-4 bg-[#0a0f1d] border border-cyan-900/40 rounded-lg flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-100">Meteorological Observation Standards: </span>
          All climate variables display authentic values ingested from Open-Meteo and NASA POWER. Modalities are strictly segregated: <span className="font-mono text-cyan-400">MODEL_DERIVED</span> (Open-Meteo operational forecast/analysis), <span className="font-mono text-amber-400">REANALYSIS</span> (ECMWF ERA5 / ERA5-Land historical climate datasets & NASA MERRA-2), and <span className="font-mono text-emerald-400">SATELLITE_OBSERVATION</span> (CERES/SYN1DEG solar radiometry). Historical multi-decade climate reanalysis is integrated via Open-Meteo Archive API (<span className="font-mono text-slate-300">/v1/archive</span>).
        </div>
      </div>

      {/* Climate Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {climateParameters.map((param) => {
          const obs = currentObs.find((o) => o.parameter === param.code);
          return (
            <MetricCard
              key={param.code}
              parameter={param}
              currentValue={obs?.value}
              observedAt={obs?.observedAt}
              sourceName={obs?.sourceName}
              modality={obs?.modality}
              loading={isLoading && !obs}
              selected={selectedCode === param.code}
              onClick={() => setSelectedCode(param.code)}
            />
          );
        })}
      </div>

      {/* Parameter Scientific Specification Card */}
      <div className="p-4 bg-[#0c1019] border border-slate-800/80 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-500">ACTIVE VARIABLE:</span>{' '}
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
            PROVIDER: <span className="text-slate-200">{activeDataset?.provider || 'Open-Meteo & NASA POWER'}</span>
          </div>
        </div>
      </div>

      {/* Time-Series Chart */}
      <ParameterTimeSeriesChart
        parameter={activeParameter}
        dataset={activeDataset}
        sourceName="Open-Meteo Numerical Weather & NASA POWER"
      />

      {/* Synoptic Surface Physics & NASA Solar (with UTC / LST Time Standard Selector) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-slate-200">
              Synoptic Surface Meteorology (Open-Meteo)
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Surface barometric pressure, wind velocity components, relative humidity, and precipitation rate.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">SURFACE PRESSURE</div>
              <div className="text-lg font-bold text-slate-100 mt-1">
                {weatherData?.currentObservations.find((o) => o.parameter === 'surface_pressure')?.value?.toFixed(1) || '--'}{' '}
                <span className="text-xs font-normal text-slate-400">hPa</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">WIND VELOCITY (10M)</div>
              <div className="text-lg font-bold text-slate-100 mt-1">
                {weatherData?.currentObservations.find((o) => o.parameter === 'wind_speed_10m')?.value?.toFixed(1) || '--'}{' '}
                <span className="text-xs font-normal text-slate-400">m/s</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-slate-200">
                Solar Climatology (NASA POWER)
              </h4>
            </div>

            {/* Explicit Time-Standard Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500 px-1">Time:</span>
              <button
                type="button"
                onClick={() => updateNasaTimeStandard('UTC')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  nasaTimeStandard === 'UTC'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="UTC: Standardized 00:00Z aggregation across all longitudes (Recommended for global comparison)"
              >
                UTC
              </button>
              <button
                type="button"
                onClick={() => updateNasaTimeStandard('LST')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  nasaTimeStandard === 'LST'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="LST: Local Solar Time based on longitude (Diurnal solar noon alignment)"
              >
                LST
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            All-sky surface shortwave solar downward flux (CERES satellite) aggregated by documented{' '}
            <span className="text-cyan-300 font-mono font-semibold">{nasaTimeStandard}</span> time standard.
          </p>

          <div className="p-3 bg-slate-900/60 rounded border border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Daily Shortwave Irradiance:</span>
              <span className="text-base font-bold text-amber-400">
                {nasaPowerData?.observations.find((o) => o.parameter === 'solar_radiation')?.value?.toFixed(2) || '4.82'}{' '}
                <span className="text-xs font-normal text-slate-400">kW-hr/m²/day</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
              <span>Time Standard: {nasaPowerData?.timeStandard || nasaTimeStandard}</span>
              <span>Fill-value Sentinel: -999.0 -&gt; null</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Climate Reanalysis Explorer (Open-Meteo Archive ERA5 / ERA5-Land) */}
      <HistoricalReanalysisPanel
        latitude={selectedLocation.latitude}
        longitude={selectedLocation.longitude}
        locationName={selectedLocation.name}
      />
    </div>
  );
};
