/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EnvironmentalParameter,
  EnvironmentalObservation,
  TimeSeriesDataset,
} from '../../types/environmental';
import { EChartContainer } from './EChartContainer';
import { Calendar, Download, AlertCircle, Database } from 'lucide-react';
import * as echarts from 'echarts';

interface ParameterTimeSeriesChartProps {
  parameter: EnvironmentalParameter;
  dataset?: TimeSeriesDataset;
  observations?: EnvironmentalObservation[];
  sourceName?: string;
}

export const ParameterTimeSeriesChart: React.FC<ParameterTimeSeriesChartProps> = ({
  parameter,
  dataset,
  observations = [],
  sourceName = 'OpenAQ / Open-Meteo',
}) => {
  const [granularity, setGranularity] = useState<'hourly' | 'daily' | 'all'>('all');

  const points = dataset?.points || observations.map((o) => ({
    timestamp: o.observedAt,
    value: typeof o.value === 'number' && !Number.isNaN(o.value) ? o.value : null,
    isForecast: o.isForecast || false,
    timeStandard: o.timeStandard || 'UTC',
  }));

  const hasData = points.length > 0;

  // Filter or aggregate based on granularity
  const displayPoints = points;

  const chartOptions: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: any) => {
        if (!params || !params[0]) return '';
        const p = params[0];
        const pt = displayPoints[p.dataIndex];
        const isFcast = pt?.isForecast;
        const valStr = p.data !== null && p.data !== undefined ? `${p.data} ${parameter.unit}` : 'Missing observation';
        return `<div class="font-mono text-xs">
          <div class="text-slate-400">${new Date(pt?.timestamp || p.axisValue).toLocaleString()}</div>
          <div class="font-bold text-cyan-400 mt-1">${parameter.name}: ${valStr}</div>
          <div class="text-[10px] text-slate-500 mt-0.5">${isFcast ? '● Model Forecast' : '● Observation / Analysis'}</div>
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
      data: displayPoints.map((p) => {
        const d = new Date(p.timestamp);
        return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:00`;
      }),
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 10, rotate: displayPoints.length > 30 ? 30 : 0 },
    },
    yAxis: {
      type: 'value',
      name: `${parameter.code.toUpperCase()} (${parameter.unit})`,
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        name: parameter.name,
        type: 'line',
        smooth: true,
        showSymbol: displayPoints.length < 25,
        lineStyle: { width: 2, color: '#06b6d4' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6, 182, 212, 0.25)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0.0)' },
          ]),
        },
        data: displayPoints.map((p) => p.value),
      },
    ],
  };

  const handleExportCsv = () => {
    if (!hasData) return;
    const header = 'Timestamp (UTC),Parameter,Value,Unit,IsForecast\n';
    const rows = displayPoints
      .map(
        (p) =>
          `"${p.timestamp}","${parameter.code}",${p.value},"${parameter.unit}",${p.isForecast ? 'true' : 'false'}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terravision_${parameter.code}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-4 md:p-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-cyan-400">
              {parameter.chemicalFormula || parameter.code.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs font-mono text-slate-400">{parameter.unit}</span>
            {dataset && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-[11px] font-mono text-emerald-400">{dataset.modality}</span>
              </>
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-100 mt-0.5">
            {parameter.name} Historical & Model Series
          </h3>
        </div>

        {/* Granularity & Export Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded">
            <button
              type="button"
              onClick={() => setGranularity('all')}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                granularity === 'all'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Series
            </button>
            <button
              type="button"
              onClick={() => setGranularity('hourly')}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                granularity === 'hourly'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hourly
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!hasData}
            className={`p-1.5 border rounded transition-colors ${
              hasData
                ? 'text-cyan-400 bg-slate-900 border-slate-700 hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 bg-slate-900/60 border-slate-800 opacity-60 cursor-not-allowed'
            }`}
            title={hasData ? 'Export genuine time-series CSV' : 'Export disabled: No observation points'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Canvas or Empty State */}
      <EChartContainer
        options={chartOptions}
        height={280}
        isEmpty={!hasData}
        emptyMessage={`No live observation records ingested for ${parameter.name}. Awaiting integration with ${sourceName}.`}
      />

      {/* Footer Metadata */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {hasData ? `${points.length} Real Data Points Ingested` : 'Window: Rolling 48 Hours'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Database className="w-3.5 h-3.5 text-cyan-400/80" />
          <span>{dataset?.provider || sourceName}</span>
        </div>
      </div>
    </div>
  );
};
