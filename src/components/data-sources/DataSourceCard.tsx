/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DataSource } from '../../types/environmental';
import { StatusBadge } from '../common/StatusBadge';
import {
  ExternalLink,
  Layers,
  Clock,
  MapPin,
  Code2,
  Activity,
} from 'lucide-react';

interface DataSourceCardProps {
  source: DataSource;
  onInspectContract?: (source: DataSource) => void;
}

export const DataSourceCard: React.FC<DataSourceCardProps> = ({
  source,
  onInspectContract,
}) => {
  return (
    <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-1.5 py-0.5 rounded">
                {source.shortCode}
              </span>
              <span className="text-xs text-slate-400 truncate max-w-[180px]">
                {source.organization}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-100 mt-1">
              {source.name}
            </h3>
          </div>

          <StatusBadge status={source.integrationStatus} size="sm" />
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {source.description}
        </p>

        {/* Technical Specifications Matrix */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/60 rounded border border-slate-800/60 mb-4 text-xs font-mono">
          <div>
            <div className="text-slate-500 flex items-center gap-1 text-[11px]">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>SPATIAL RES</span>
            </div>
            <div className="text-slate-200 mt-0.5 truncate">{source.spatialResolution}</div>
          </div>

          <div>
            <div className="text-slate-500 flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>CADENCE</span>
            </div>
            <div className="text-slate-200 mt-0.5 truncate">{source.temporalResolution}</div>
          </div>

          <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">MODALITY</span>
            <span className="text-cyan-400 font-bold">{source.modality}</span>
          </div>

          {source.latencyMs !== undefined && (
            <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>MEASURED LATENCY</span>
              </span>
              <span className="text-emerald-400 font-bold tabular-nums">{source.latencyMs} ms</span>
            </div>
          )}
        </div>

        {/* Parameters Supported */}
        <div className="mb-4">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            <span>Target Parameters</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {source.supportedParameters.map((p) => (
              <span
                key={p}
                className="text-[11px] font-mono bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Links */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
        <a
          href={source.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <span>Official API Docs</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {onInspectContract && (
          <button
            type="button"
            onClick={() => onInspectContract(source)}
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors font-mono text-xs cursor-pointer"
          >
            <Code2 className="w-3 h-3 text-cyan-400" />
            <span>Contract Spec</span>
          </button>
        )}
      </div>
    </div>
  );
};
