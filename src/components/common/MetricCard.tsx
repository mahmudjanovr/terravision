/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EnvironmentalParameter, DataModality } from '../../types/environmental';
import { StatusBadge } from './StatusBadge';

interface MetricCardProps {
  parameter: EnvironmentalParameter;
  currentValue?: number | null;
  observedAt?: string | null;
  sourceName?: string;
  modality?: DataModality;
  loading?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  parameter,
  currentValue = null,
  observedAt = null,
  sourceName,
  modality,
  loading = false,
  onClick,
  selected = false,
}) => {
  const hasValue = currentValue !== null && currentValue !== undefined;

  const formatModality = (mod?: DataModality) => {
    switch (mod) {
      case 'GROUND_OBSERVATION':
        return 'Ground Sensor';
      case 'MODEL_DERIVED':
        return 'Atmospheric Model';
      case 'SATELLITE_OBSERVATION':
        return 'Satellite Assimilation';
      case 'REANALYSIS':
        return 'Reanalysis Model';
      case 'FORECAST':
        return 'Numerical Forecast';
      default:
        return '';
    }
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`border rounded-lg p-4 text-left transition-all ${
        selected
          ? 'border-cyan-500/60 bg-[#0e1626]'
          : 'border-slate-800/80 bg-[#0b0f19] hover:border-slate-700/80'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {parameter.code}
            </span>
            {parameter.chemicalFormula && (
              <span className="text-xs font-mono text-cyan-400/90 font-medium">
                {parameter.chemicalFormula}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mt-0.5 truncate max-w-[190px]">
            {parameter.name}
          </h4>
        </div>

        <StatusBadge status={hasValue ? 'VALIDATED' : loading ? 'pending' : 'not_integrated'} size="sm" />
      </div>

      <div className="mt-3 flex items-baseline">
        {loading ? (
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono text-slate-600 animate-pulse">
              ...
            </span>
            <span className="text-[11px] font-mono text-cyan-400/80 mt-0.5">
              Querying live API ({parameter.unit})
            </span>
          </div>
        ) : hasValue ? (
          <>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {currentValue.toFixed(parameter.precisionDecimals)}
            </span>
            <span className="ml-1.5 text-xs font-mono text-slate-400 uppercase">
              {parameter.unit}
            </span>
          </>
        ) : (
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono tracking-widest text-slate-600">
              --
            </span>
            <span className="text-[11px] font-mono text-slate-400 mt-0.5">
              Unavailable for location ({parameter.unit})
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="truncate max-w-[150px]">
          {modality ? (
            <span className="text-cyan-400/90">{formatModality(modality)}</span>
          ) : (
            <span>{sourceName || 'Target: OpenAQ / Open-Meteo'}</span>
          )}
        </div>
        <span>
          {observedAt
            ? new Date(observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Pending'}
        </span>
      </div>
    </div>
  );
};
