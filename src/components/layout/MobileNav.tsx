/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageId } from '../../types/navigation';
import { NAV_ITEMS, APP_CONFIG } from '../../config/appConfig';
import {
  Globe,
  Wind,
  Thermometer,
  Map,
  BarChart3,
  Search,
  Database,
  Sliders,
  X,
  ShieldCheck,
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Globe,
  Wind,
  Thermometer,
  Map,
  BarChart3,
  Search,
  Database,
  Sliders,
};

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-4/5 max-w-xs bg-[#07090e] border-r border-slate-800 flex flex-col h-full z-10 p-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-slate-100 tracking-tight">{APP_CONFIG.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.iconName] || Globe;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-slate-900 text-cyan-400 font-medium border border-slate-800'
                    : 'text-slate-300 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 mb-1 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Data Integrity Protocol</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Real data providers: Open-Meteo, OpenAQ, NASA, Copernicus.
          </p>
        </div>
      </div>
    </div>
  );
};
