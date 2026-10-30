/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ComparisonChart } from '../../components/charts/ComparisonChart';
import { ParameterTimeSeriesChart } from '../../components/charts/ParameterTimeSeriesChart';
import { STANDARD_PARAMETERS } from '../../utils/parameters';
import {
  useEnvironmentalData,
  GLOBAL_LOCATION_PRESETS,
} from '../../hooks/useEnvironmentalData';
import { Calendar, GitCompare, MapPin, ShieldCheck, RefreshCw } from 'lucide-react';

interface AnalyticsPageProps {
  onNavigateToSources: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigateToSources }) => {
  const [primaryParamCode, setPrimaryParamCode] = useState('temperature_2m');
  const [secondaryParamCode, setSecondaryParamCode] = useState('relative_humidity');

  const {
    selectedLocation,
    weatherData,
    airQualityData,
    nasaPowerData,
    isLoading,
    changeLocation,
    refreshAll,
  } = useEnvironmentalData();

  const primaryParam =
    STANDARD_PARAMETERS.find((p) => p.code === primaryParamCode) || STANDARD_PARAMETERS[0];
  const secondaryParam =
    STANDARD_PARAMETERS.find((p) => p.code === secondaryParamCode) || STANDARD_PARAMETERS[7];

  // Retrieve matching datasets
  const getDataset = (code: string) => {
    return (
      weatherData?.hourlyDatasets[code] ||
      airQualityData?.hourlyDatasets[code] ||
      nasaPowerData?.datasets[code]
    );
  };

  const primaryDataset = getDataset(primaryParamCode);
  const secondaryDataset = getDataset(secondaryParamCode);

  // Build comparison series data if available
  const comparisonSeries = [];
  const comparisonCategories: string[] = [];

  if (primaryDataset && secondaryDataset && primaryDataset.points.length > 0) {
    const minLen = Math.min(primaryDataset.points.length, secondaryDataset.points.length, 36);
    for (let i = 0; i < minLen; i++) {
      const d = new Date(primaryDataset.points[i].timestamp);
      comparisonCategories.push(`${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours()}:00`);
    }

    comparisonSeries.push({
      name: `${primaryParam.name} (${primaryDataset.unit})`,
      data: primaryDataset.points.slice(0, minLen).map((p) => p.value),
    });

    comparisonSeries.push({
      name: `${secondaryParam.name} (${secondaryDataset.unit})`,
      data: secondaryDataset.points.slice(0, minLen).map((p) => p.value),
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <SectionHeader
        title="Historical & Comparative Analytics"
        subtitle="Multi-parameter correlation, real-world temporal series, and cross-variable telemetry directly from open APIs."
        badge="Real Time Series Active"
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
              title="Refresh time-series"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Multi-Parameter Comparative Matrix Toolbar */}
      <div className="p-4 bg-[#0c1019] border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">PRIMARY VARIABLE:</span>
            <select
              value={primaryParamCode}
              onChange={(e) => setPrimaryParamCode(e.target.value)}
              className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-cyan-400 font-semibold cursor-pointer focus:outline-none"
            >
              {STANDARD_PARAMETERS.map((p) => (
                <option key={p.code} value={p.code} className="bg-slate-900 text-slate-200">
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">SECONDARY VARIABLE:</span>
            <select
              value={secondaryParamCode}
              onChange={(e) => setSecondaryParamCode(e.target.value)}
              className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-emerald-400 font-semibold cursor-pointer focus:outline-none"
            >
              {STANDARD_PARAMETERS.map((p) => (
                <option key={p.code} value={p.code} className="bg-slate-900 text-slate-200">
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real Observation Provenance: Open-Meteo & NASA POWER</span>
        </div>
      </div>

      {/* Primary Historical Timeseries */}
      <div className="space-y-4">
        <ParameterTimeSeriesChart
          parameter={primaryParam}
          dataset={primaryDataset}
          sourceName="Open-Meteo & NASA POWER Feeds"
        />
      </div>

      {/* Cross-Source & Correlation Comparison Section */}
      <div className="space-y-4">
        <ComparisonChart
          title={`${primaryParam.name} vs ${secondaryParam.name} Synchronized Timeline`}
          subtitle={`Multi-variable observational telemetry for ${selectedLocation.name} across concurrent time axes.`}
          seriesData={comparisonSeries}
          categories={comparisonCategories}
          unit="Multi-Unit"
        />
      </div>
    </div>
  );
};
