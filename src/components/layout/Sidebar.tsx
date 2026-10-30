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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-[#07090e] border-r border-slate-800/80 transition-all duration-200 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="truncate">
              <div className="text-sm font-bold tracking-tight text-slate-100 uppercase">
                {APP_CONFIG.name}
              </div>
              <div className="text-[10px] font-mono text-cyan-400/90 truncate">
                ENVIRONMENTAL INTEL
              </div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center">
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded transition-colors ${
            collapsed ? 'hidden' : 'block'
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.iconName] || Globe;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-left group cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-cyan-400 font-medium border border-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Expand trigger when collapsed */}
      {collapsed && (
        <div className="p-2 border-t border-slate-800/80 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Architecture Notice Footer */}
      {!collapsed && (
        <div className="p-3 m-3 bg-[#0c1019] border border-slate-800/80 rounded">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Integrity Rule</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Zero fabricated readings. Real data streaming from Open-Meteo & NASA.
          </p>
          <div className="mt-2 text-[10px] font-mono text-emerald-400">
            BUILD // PHASE 2 LIVE INGESTION
          </div>
        </div>
      )}
    </aside>
  );
};
