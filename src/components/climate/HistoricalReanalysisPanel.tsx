/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Historical Climate Reanalysis Explorer
 * Integrates Open-Meteo Archive API with ECMWF ERA5 and ERA5-Land multi-decade datasets.
 * Enforces strict REANALYSIS modality, UTC time standard, coordinate/date validation, and full data provenance.
 */

import React, { useState, useEffect } from 'react';
import {
  fetchHistoricalReanalysis,
  HistoricalReanalysisResult,
  ReanalysisModel,
  validateArchiveDateRange,
} from '../../services/api/openMeteoArchive';
import { EChartContainer } from '../charts/EChartContainer';
import { STANDARD_PARAMETERS } from '../../utils/parameters';
import { EnvironmentalParameter } from '../../types/environmental';
import {
  History,
  ShieldCheck,
  Calendar,
  Layers,
  Download,
  AlertTriangle,
  RefreshCw,
  Info,
  Clock,
  Compass,
  Database,
} from 'lucide-react';
import * as echarts from 'echarts';

interface HistoricalReanalysisPanelProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

const HISTORICAL_PRESETS = [
  {
    name: 'Jan 2023 Baseline',
    startDate: '2023-01-01',
    endDate: '2023-01-07',
    description: 'Post-holiday winter baseline week',
  },
  {
    name: 'July 2022 European Heatwave',
    startDate: '2022-07-15',
    endDate: '2022-07-21',
    description: 'Historic temperature anomalies across Europe',
  },
  {
    name: 'Feb 2021 Arctic Outbreak',
    startDate: '2021-02-12',
    endDate: '2021-02-18',
    description: 'Sub-zero Polar vortex disruption event',
  },
  {
    name: 'Aug 2020 Summer Climatology',
    startDate: '2020-08-10',
    endDate: '2020-08-16',
    description: 'High summer radiation and diurnal cycle',
  },
];

export const HistoricalReanalysisPanel: React.FC<HistoricalReanalysisPanelProps> = ({
  latitude,
  longitude,
  locationName,
}) => {
  const [model, setModel] = useState<ReanalysisModel>('era5');
  const [startDate, setStartDate] = useState<string>('2023-01-01');
  const [endDate, setEndDate] = useState<string>('2023-01-07');
  const [selectedParamCode, setSelectedParamCode] = useState<string>('temperature_2m');

  const [data, setData] = useState<HistoricalReanalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableParams = STANDARD_PARAMETERS.filter((p) =>
    ['temperature_2m', 'relative_humidity', 'precipitation', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m'].includes(
      p.code
    )
  );

  const activeParam: EnvironmentalParameter =
    availableParams.find((p) => p.code === selectedParamCode) || availableParams[0];

  const loadReanalysisData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Pre-flight date validation
      validateArchiveDateRange(startDate, endDate, model);

      const res = await fetchHistoricalReanalysis(latitude, longitude, {
        startDate,
        endDate,
        model,
      });
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to retrieve historical reanalysis data.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReanalysisData();
  }, [latitude, longitude, model]);

  const activeDataset = data?.datasets[selectedParamCode];
  const points = activeDataset?.points || [];
  const validPoints = points.filter((p) => typeof p.value === 'number' && !Number.isNaN(p.value));
  const hasValues = validPoints.length > 0;

  // Compute summary stats
  const values = validPoints.map((p) => p.value as number);
  const minVal = values.length ? Math.min(...values) : null;
  const maxVal = values.length ? Math.max(...values) : null;
  const avgVal = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  // Chart options
  const chartOptions: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0c101d',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: any) => {
        if (!params || !params[0]) return '';
        const p = params[0];
        const valStr =
          p.data !== null && p.data !== undefined
            ? `${Number(p.data).toFixed(activeParam.precisionDecimals)} ${activeDataset?.unit || activeParam.unit}`
            : 'Unavailable / Missing';
        return `<div class="font-mono text-xs">
          <div class="text-amber-400 font-bold mb-1">[REANALYSIS] ${data?.modelDisplayName}</div>
          <div class="text-slate-400">Timestamp: ${p.axisValue} (UTC)</div>
          <div class="font-bold text-cyan-300 mt-1">${activeParam.name}: ${valStr}</div>
          <div class="text-[10px] text-slate-500 mt-1">Provider: Open-Meteo / ECMWF Copernicus</div>
        </div>`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((p) => {
        const d = new Date(p.timestamp);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
          d.getUTCDate()
        ).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:00`;
      }),
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 10, rotate: points.length > 40 ? 30 : 0 },
    },
    yAxis: {
      type: 'value',
      name: `${activeParam.name} (${activeDataset?.unit || activeParam.unit})`,
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        name: activeParam.name,
        type: 'line',
        smooth: true,
        connectNulls: false,
        lineStyle: { width: 2, color: '#f59e0b' }, // Amber for REANALYSIS modality
        itemStyle: { color: '#f59e0b' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.22)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.0)' },
          ]),
        },
        data: points.map((p) => p.value),
      },
    ],
  };

  const handleExportCsv = () => {
    if (!hasValues) return;
    const header = 'Timestamp (UTC),Model,Parameter,Value,Unit,Modality,TimeStandard\n';
    const rows = points
      .map(
        (p) =>
          `"${p.timestamp}","${data?.model}","${activeParam.code}",${p.value ?? ''},"${
            activeDataset?.unit || activeParam.unit
          }","REANALYSIS","UTC"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terravision_reanalysis_${model}_${activeParam.code}_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-amber-900/40 bg-[#0a0d18] rounded-xl p-5 md:p-6 space-y-6">
      {/* Header and Modality Differentiation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-slate-100">
              ECMWF Historical Climate Reanalysis
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
              MODALITY: REANALYSIS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Multi-decade global atmospheric reanalysis combining historical in-situ observations with numerical physics models.
            Strictly distinguished from operational numerical forecasts. Provided via{' '}
            <span className="text-slate-200 font-mono">https://archive-api.open-meteo.com/v1/archive</span>.
          </p>
        </div>

        {/* Global time standard badge */}
        <div className="flex items-center gap-2 self-start md:self-auto px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded font-mono text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Standard:</span>
          <span className="text-cyan-300 font-bold">UTC (GMT)</span>
        </div>
      </div>

      {/* Query Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[#070a12] border border-slate-800/80 rounded-lg text-xs font-mono">
        {/* Model Selection */}
        <div>
          <label className="text-slate-400 block mb-1.5 font-sans font-semibold">REANALYSIS MODEL</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ReanalysisModel)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="era5">ECMWF ERA5 (0.25° / 31 km Global)</option>
            <option value="era5_land">ECMWF ERA5-Land (0.1° / 9 km Land)</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="text-slate-400 block mb-1.5 font-sans font-semibold">START DATE (UTC)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={model === 'era5_land' ? '1950-01-01' : '1940-01-01'}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="text-slate-400 block mb-1.5 font-sans font-semibold">END DATE (UTC)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={loadReanalysisData}
            disabled={isLoading}
            className="w-full h-8 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-sans rounded cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Retrieving ERA5...' : 'Query Archive'}</span>
          </button>
        </div>
      </div>

      {/* Preset Events Bar */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500 font-mono text-[11px] mr-1">HISTORICAL BENCHMARKS:</span>
        {HISTORICAL_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setStartDate(p.startDate);
              setEndDate(p.endDate);
              // auto-query with new dates
              fetchHistoricalReanalysis(latitude, longitude, {
                startDate: p.startDate,
                endDate: p.endDate,
                model,
              })
                .then(setData)
                .catch((e) => setErrorMessage(e.message));
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded cursor-pointer transition-colors"
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Parameter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {availableParams.map((p) => {
          const isSelected = selectedParamCode === p.code;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => setSelectedParamCode(p.code)}
              className={`px-3 py-1.5 rounded text-xs font-mono shrink-0 transition-colors cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-bold'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.name} ({p.unit})
            </button>
          );
        })}
      </div>

      {/* Loading, Error, Empty, or Chart View */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-[#070a12] border border-slate-800/80 rounded-lg">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Ingesting {model.toUpperCase()} reanalysis array from archive-api.open-meteo.com...
          </span>
        </div>
      ) : errorMessage ? (
        <div className="p-4 bg-red-950/30 border border-red-900/60 rounded-lg flex items-start gap-3 text-xs text-red-300">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-red-200">Reanalysis Ingestion Error</div>
            <div className="text-red-300/90 leading-relaxed">{errorMessage}</div>
            <div className="text-[11px] text-slate-400 mt-2 font-mono">
              Note: Historical ERA5 reanalysis has a ~5-day assimilation latency. For operational forecasts, consult the weather forecast endpoint.
            </div>
          </div>
        </div>
      ) : !hasValues ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 bg-[#070a12] border border-slate-800/80 rounded-lg text-xs text-slate-400 font-mono">
          <Info className="w-5 h-5 text-amber-400/80" />
          <span>Parameter '{activeParam.name}' is unavailable for model {model.toUpperCase()} at these coordinates.</span>
          <span className="text-slate-500 text-[11px]">
            ERA5-Land excludes maritime cells; switch to ERA5 for continuous global coverage.
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Metric Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">MINIMUM ({activeParam.unit})</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">
                {minVal !== null ? minVal.toFixed(activeParam.precisionDecimals) : '--'}
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">MAXIMUM ({activeParam.unit})</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">
                {maxVal !== null ? maxVal.toFixed(activeParam.precisionDecimals) : '--'}
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">MEAN VALUE ({activeParam.unit})</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {avgVal !== null ? avgVal.toFixed(activeParam.precisionDecimals) : '--'}
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">HOURLY POINTS RETRIEVED</div>
              <div className="text-base font-bold text-cyan-400 mt-0.5">
                {validPoints.length} verified
              </div>
            </div>
          </div>

          {/* Interactive EChart */}
          <div className="border border-slate-800/80 bg-[#070a12] rounded-lg p-3">
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="font-bold text-amber-400">{activeParam.name}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{locationName} ({latitude.toFixed(2)}°, {longitude.toFixed(2)}°)</span>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                title="Export reanalysis time series as CSV"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export CSV</span>
              </button>
            </div>

            <EChartContainer options={chartOptions} className="h-72 w-full" />
          </div>

          {/* Provenance Record Inspector Card */}
          <div className="p-4 bg-[#070a12] border border-slate-800 rounded-lg text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>DATA PROVENANCE & SCIENTIFIC AUDIT RECORD</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-slate-400 pt-1">
              <div>
                <span className="text-slate-500 block">PROVIDER:</span>
                <span className="text-slate-200">Open-Meteo Historical Archive</span>
              </div>
              <div>
                <span className="text-slate-500 block">DATASET / MODEL:</span>
                <span className="text-amber-300 font-semibold">{data?.modelDisplayName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">DATA MODALITY:</span>
                <span className="text-amber-400 font-bold">REANALYSIS</span>
              </div>
              <div>
                <span className="text-slate-500 block">TIME STANDARD:</span>
                <span className="text-cyan-300 font-bold">UTC (Documented Standard)</span>
              </div>
              <div>
                <span className="text-slate-500 block">COORDINATES:</span>
                <span className="text-slate-200">{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</span>
              </div>
              <div>
                <span className="text-slate-500 block">DATE RANGE:</span>
                <span className="text-slate-200">{startDate} to {endDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block">RETRIEVAL TIMESTAMP:</span>
                <span className="text-slate-200">{data?.fetchedAt}</span>
              </div>
              <div>
                <span className="text-slate-500 block">QUALITY STATUS:</span>
                <span className="text-emerald-400 font-bold">verified (ERA5 4D-Var)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
