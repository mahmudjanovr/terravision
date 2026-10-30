/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageId } from '../../types/navigation';
import { NAV_ITEMS, APP_CONFIG } from '../../config/appConfig';
import { Search, Sliders, Menu, Globe2 } from 'lucide-react';

interface TopHeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenSearch: () => void;
  onToggleMobileNav: () => void;
  timeRange: string;
  onChangeTimeRange: (range: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenSearch,
  onToggleMobileNav,
  timeRange,
  onChangeTimeRange,
}) => {
  const currentNav = NAV_ITEMS.find((item) => item.id === currentPage);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-3 bg-[#080b11]/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Mobile toggle & Brand Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-cyan-400 shrink-0 hidden sm:block" />
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            {APP_CONFIG.name}
          </span>
          <span className="hidden lg:inline text-xs font-mono text-slate-500">
            / {currentNav?.label || 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (4-5 key sections) */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          type="button"
          onClick={() => onNavigate('overview')}
          className={`hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer ${
            currentPage === 'overview' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => onNavigate('air-quality')}
          className={`hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer ${
            currentPage === 'air-quality' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Air Quality
        </button>
        <button
          type="button"
          onClick={() => onNavigate('climate')}
          className={`hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer ${
            currentPage === 'climate' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Climate
        </button>
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className={`hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer ${
            currentPage === 'map' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Global Map
        </button>
        <button
          type="button"
          onClick={() => onNavigate('sources')}
          className={`hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer ${
            currentPage === 'sources' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Data Sources
        </button>
      </nav>

      {/* Zone 3: Search, Time range selector, and Data Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded transition-colors cursor-pointer"
          aria-label="Search environmental coordinates or parameters"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Search indicators...</span>
          <kbd className="hidden md:inline text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded">
          <Sliders className="w-3 h-3 text-slate-500" />
          <select
            value={timeRange}
            onChange={(e) => onChangeTimeRange(e.target.value)}
            className="bg-transparent text-xs font-mono text-slate-300 focus:outline-none cursor-pointer pr-1"
            aria-label="Time window selection"
          >
            <option value="latest" className="bg-slate-900">Latest (Raw)</option>
            <option value="24h" className="bg-slate-900">Past 24 Hours</option>
            <option value="7d" className="bg-slate-900">Past 7 Days</option>
            <option value="30d" className="bg-slate-900">Past 30 Days</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('sources')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 bg-slate-900/60 border border-slate-800/90 rounded hover:border-slate-700 transition-colors cursor-pointer"
          title="Data Ingestion Status: Phase 2 Active Feeds"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Feed:</span>
          <span className="text-emerald-400">Live (Open-Meteo & NASA)</span>
        </button>
      </div>
    </header>
  );
};
