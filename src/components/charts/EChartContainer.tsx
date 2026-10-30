/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartContainerProps {
  options: echarts.EChartsOption;
  height?: string | number;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export const EChartContainer: React.FC<EChartContainerProps> = ({
  options,
  height = '320px',
  className = '',
  emptyMessage,
  isEmpty = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || isEmpty) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas',
      });
    }

    const styledOptions: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: "'IBM Plex Mono', monospace",
        color: '#94a3b8',
      },
      ...options,
    };

    chartInstance.current.setOption(styledOptions, true);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [options, isEmpty]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (isEmpty) {
    return (
      <div
        className={`w-full flex flex-col items-center justify-center border border-dashed border-slate-800 bg-[#090d15] rounded-lg p-6 ${className}`}
        style={{ height }}
      >
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
          OBSERVATION STREAM EMPTY
        </span>
        <p className="text-sm text-slate-400 text-center max-w-sm">
          {emptyMessage || 'No real observations logged for the selected time window. Awaiting API integration.'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
};
