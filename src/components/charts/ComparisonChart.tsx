/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EChartContainer } from './EChartContainer';
import * as echarts from 'echarts';

interface ComparisonChartProps {
  title?: string;
  subtitle?: string;
  seriesData?: {
    name: string;
    data: (number | null)[];
  }[];
  categories?: string[];
  unit?: string;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  title = 'Multi-Station Comparative Telemetry',
  subtitle = 'Cross-validation across ground stations and satellite soundings',
  seriesData = [],
  categories = [],
  unit = 'µg/m³',
}) => {
  const [metricMode, setMetricMode] = useState<'correlation' | 'absolute'>('absolute');
  const hasData = seriesData.length > 0 && seriesData.some((s) => s.data.length > 0);

  const chartOptions: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    legend: {
      data: seriesData.map((s) => s.name),
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: seriesData.map((s, idx) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data,
      lineStyle: {
        width: 2,
        color: idx === 0 ? '#06b6d4' : idx === 1 ? '#10b981' : '#f59e0b',
      },
    })),
  };

  return (
    <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded">
          <button
            type="button"
            onClick={() => setMetricMode('absolute')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              metricMode === 'absolute'
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Absolute Values
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('correlation')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              metricMode === 'correlation'
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scatter Correlation
          </button>
        </div>
      </div>

      <EChartContainer
        options={chartOptions}
        height={280}
        isEmpty={!hasData}
        emptyMessage="Comparative analytics requires at least two concurrent observational datasets. Ingestion channels pending in Phase 2."
      />
    </div>
  );
};
