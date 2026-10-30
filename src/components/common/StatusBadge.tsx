/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { IntegrationStatus, QualityStatus } from '../../types/environmental';

interface StatusBadgeProps {
  status: IntegrationStatus | QualityStatus | 'standby' | 'pending';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let label = '';
  let glyph = '●';
  let colorClass = 'text-slate-400';
  const s = String(status).toUpperCase();

  if (s === 'CONNECTED' || s === 'VERIFIED') {
    label = s === 'CONNECTED' ? 'Connected' : 'Verified Quality';
    glyph = '●';
    colorClass = 'text-emerald-400';
  } else if (s === 'IN_DEVELOPMENT' || s === 'PRELIMINARY') {
    label = s === 'IN_DEVELOPMENT' ? 'In Development' : 'Preliminary';
    glyph = '◐';
    colorClass = 'text-cyan-400';
  } else if (s === 'NOT_INTEGRATED') {
    label = size === 'sm' ? 'Phase 1' : 'Not Integrated (Phase 1)';
    glyph = '○';
    colorClass = 'text-slate-400';
  } else if (s === 'DEGRADED' || s === 'SENSOR_MAINTENANCE') {
    label = s === 'DEGRADED' ? 'Degraded API' : 'Maintenance';
    glyph = '▲';
    colorClass = 'text-amber-400';
  } else if (s === 'OFFLINE' || s === 'UNAVAILABLE' || s === 'ANOMALOUS_FLAGGED') {
    label = s === 'ANOMALOUS_FLAGGED' ? 'Anomalous Flag' : 'Unavailable';
    glyph = '✖';
    colorClass = 'text-rose-400';
  } else if (s === 'NOT_CONFIGURED') {
    label = 'Key Required';
    glyph = '○';
    colorClass = 'text-amber-400';
  } else {
    label = 'Data Pending';
    glyph = '◌';
    colorClass = 'text-slate-400';
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-xs md:text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${textSize} ${colorClass}`}>
      <span aria-hidden="true" className="text-[10px] select-none">{glyph}</span>
      <span>{label}</span>
    </span>
  );
};
