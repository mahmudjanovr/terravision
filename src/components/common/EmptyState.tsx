/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Database, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  sourceTarget?: string;
  suggestedAction?: {
    label: string;
    onClick: () => void;
    icon?: 'database' | 'refresh' | 'external';
  };
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  sourceTarget,
  suggestedAction,
  compact = false,
}) => {
  return (
    <div
      className={`border border-slate-800/80 bg-[#0c1019] rounded-lg text-center flex flex-col items-center justify-center ${
        compact ? 'p-6' : 'p-10 md:p-14'
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
        <Database className="w-5 h-5 text-cyan-400/80" />
      </div>

      <h4 className="text-base font-semibold text-slate-200 mb-1">{title}</h4>
      <p className="text-sm text-slate-400 max-w-lg mb-4 leading-relaxed">{description}</p>

      {sourceTarget && (
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-4 bg-slate-900/60 px-3 py-1.5 rounded border border-slate-800/60">
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Architectural Target: {sourceTarget}</span>
        </div>
      )}

      {suggestedAction && (
        <button
          type="button"
          onClick={suggestedAction.onClick}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded transition-colors whitespace-nowrap cursor-pointer"
        >
          {suggestedAction.icon === 'database' && <Database className="w-3.5 h-3.5 text-cyan-400" />}
          {suggestedAction.icon === 'refresh' && <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
          {suggestedAction.icon === 'external' && <ExternalLink className="w-3.5 h-3.5 text-slate-400" />}
          <span>{suggestedAction.label}</span>
        </button>
      )}
    </div>
  );
};
