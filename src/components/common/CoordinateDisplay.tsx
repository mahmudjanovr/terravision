/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatCoordinates } from '../../utils/coordinates';
import { Compass } from 'lucide-react';

interface CoordinateDisplayProps {
  latitude: number;
  longitude: number;
  label?: string;
  className?: string;
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
  latitude,
  longitude,
  label,
  className = '',
}) => {
  const formatted = formatCoordinates(latitude, longitude, { decimals: 4 });

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-xs text-slate-300 ${className}`}>
      <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
      {label && <span className="text-slate-400">{label}:</span>}
      <span className="tabular-nums tracking-wide">{formatted}</span>
    </div>
  );
};
