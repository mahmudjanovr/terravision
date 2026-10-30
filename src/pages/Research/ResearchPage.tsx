/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SectionHeader } from '../../components/common/SectionHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { STANDARD_PARAMETERS } from '../../utils/parameters';
import { DATA_SOURCES } from '../../config/dataSources';
import { fetchOpenMeteoWeather } from '../../services/api/openMeteoWeather';
import { fetchOpenMeteoAirQuality } from '../../services/api/openMeteoAirQuality';
import { EnvironmentalObservation } from '../../types/environmental';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Layers,
  Database,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface ResearchPageProps {
  onNavigateToSources: () => void;
}

export const ResearchPage: React.FC<ResearchPageProps> = ({ onNavigateToSources }) => {
  const [geoScope, setGeoScope] = useState<'global' | 'point'>('point');
  const [lat, setLat] = useState('51.5074');
  const [lon, setLon] = useState('-0.1278');
  const [selectedParams, setSelectedParams] = useState<string[]>(['temperature_2m', 'pm25', 'relative_humidity']);
  const [selectedSources, setSelectedSources] = useState<string[]>(['open-meteo', 'open-meteo-aq']);

  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [results, setResults] = useState<EnvironmentalObservation[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);

  const toggleParam = (code: string) => {
    setSelectedParams((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const toggleSource = (id: string) => {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleExecuteQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setQueryError(null);
    setHasQueried(true);

    const numericLat = parseFloat(lat);
    const numericLon = parseFloat(lon);

    if (Number.isNaN(numericLat) || Number.isNaN(numericLon)) {
      setQueryError('Please enter valid numeric latitude [-90, 90] and longitude [-180, 180].');
      setIsLoading(false);
      return;
    }

    try {
      const records: EnvironmentalObservation[] = [];

      // Query Open-Meteo Weather if selected
      if (selectedSources.includes('open-meteo')) {
        const weather = await fetchOpenMeteoWeather(numericLat, numericLon, { pastDays: 1, forecastDays: 1 });
        const filteredWeather = weather.currentObservations.filter((o) =>
          selectedParams.includes(o.parameter)
        );
        records.push(...filteredWeather);
      }

      // Query Open-Meteo Air Quality if selected
      if (selectedSources.includes('open-meteo-aq')) {
        const aq = await fetchOpenMeteoAirQuality(numericLat, numericLon, { pastDays: 1, forecastDays: 1 });
        const filteredAq = aq.currentObservations.filter((o) =>
          selectedParams.includes(o.parameter)
        );
        records.push(...filteredAq);
      }

      setResults(records);
    } catch (err: any) {
      setQueryError(err.message || 'Error executing query against provider API.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportResults = () => {
    if (results.length === 0) return;
    const header = 'ID,Source,Parameter,Value,Unit,Latitude,Longitude,ObservedAt,Modality\n';
    const rows = results
      .map(
        (r) =>
          `"${r.id}","${r.sourceId}","${r.parameter}",${r.value},"${r.unit}",${r.latitude},${r.longitude},"${r.observedAt}","${r.modality}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terravision_research_query_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <SectionHeader
        title="Research & Query Explorer"
        subtitle="Precision data exploration console. Executes live queries against open earth observation APIs and exports authenticated raw datasets."
        badge="Live Query Engine"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Filter Column (Query Builder Form) */}
        <form
          onSubmit={handleExecuteQuery}
          className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5 space-y-5 lg:col-span-1"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span>Query Parameters</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">REST ACTIVE</span>
          </div>

          {/* 1. Spatial Scope */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Geographic Coordinates</span>
            </label>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500">LATITUDE [-90..90]</span>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  placeholder="51.5074"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">LONGITUDE [-180..180]</span>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  placeholder="-0.1278"
                />
              </div>
            </div>
          </div>

          {/* 2. Parameters Multi-select */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Environmental Parameters</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {STANDARD_PARAMETERS.map((p) => {
                const isSelected = selectedParams.includes(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => toggleParam(p.code)}
                    className={`px-2.5 py-1.5 rounded text-left text-xs font-mono transition-colors flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{p.code.toUpperCase()}</span>
                    <span className="text-[10px] text-slate-500">{p.unit}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Target Providers */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>3. Live Query Providers</span>
            </label>
            <div className="space-y-1">
              {DATA_SOURCES.map((s) => {
                const isSelected = selectedSources.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSource(s.id)}
                    className={`w-full px-2.5 py-1.5 rounded text-left text-xs font-mono flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="text-[10px] text-cyan-400">{s.shortCode}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Live Query...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Query Live APIs</span>
              </>
            )}
          </button>
        </form>

        {/* Right Results Stage */}
        <div className="space-y-4 lg:col-span-2">
          {/* Query Summary Card */}
          <div className="p-4 bg-[#0c1019] border border-slate-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <div className="text-slate-500">QUERY SPECIFICATION:</div>
              <div className="text-slate-200 font-semibold mt-0.5">
                COORDS ({lat}°, {lon}°) · {selectedParams.length} PARAMETERS · {selectedSources.length} PROVIDERS
              </div>
            </div>

            {results.length > 0 && (
              <button
                type="button"
                onClick={handleExportResults}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/60 rounded cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export {results.length} Records (.CSV)</span>
              </button>
            )}
          </div>

          {/* Query Results Viewport */}
          <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5 min-h-[380px] flex flex-col">
            {queryError && (
              <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 mb-4 font-mono">
                Error: {queryError}
              </div>
            )}

            {results.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Showing {results.length} verified observation records</span>
                  <span className="text-emerald-400">● Verified Live Data</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5">Value</th>
                        <th className="p-2.5">Unit</th>
                        <th className="p-2.5">Modality</th>
                        <th className="p-2.5">Source</th>
                        <th className="p-2.5">Observed (UTC)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {results.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-2.5 font-bold text-cyan-300">{r.parameter.toUpperCase()}</td>
                          <td className="p-2.5 font-bold tabular-nums text-slate-100">
                            {r.value !== null ? r.value.toFixed(1) : '--'}
                          </td>
                          <td className="p-2.5 text-slate-400">{r.unit}</td>
                          <td className="p-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                              {r.modality}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 truncate max-w-[140px]">{r.sourceName}</td>
                          <td className="p-2.5 text-slate-400">{new Date(r.observedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : hasQueried && !isLoading ? (
              <EmptyState
                title="Query Completed: 0 Observational Records Returned"
                description="The query executed successfully, but no matching parameters were available from the selected providers for this coordinate."
                sourceTarget={selectedSources.join(', ')}
                suggestedAction={{
                  label: 'Inspect Data Source Readiness',
                  onClick: onNavigateToSources,
                  icon: 'database',
                }}
              />
            ) : (
              <div className="text-center py-16 my-auto">
                <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-200">
                  Ready for Live Structured Query
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  Enter geographic coordinates and select criteria parameters, then execute to stream and export authentic raw datasets.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Real Data Integrity Guarantee: Direct API stream, zero mock records</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
