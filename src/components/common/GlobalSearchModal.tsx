/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageId } from '../../types/navigation';
import { STANDARD_PARAMETERS } from '../../utils/parameters';
import { DATA_SOURCES } from '../../config/dataSources';
import { NAV_ITEMS } from '../../config/appConfig';
import { Search, X, ArrowRight, Layers, Database, Globe } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or listener
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredParams = STANDARD_PARAMETERS.filter(
    (param) =>
      param.name.toLowerCase().includes(query.toLowerCase()) ||
      param.code.toLowerCase().includes(query.toLowerCase()) ||
      (param.chemicalFormula && param.chemicalFormula.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredSources = DATA_SOURCES.filter(
    (source) =>
      source.name.toLowerCase().includes(query.toLowerCase()) ||
      source.shortCode.toLowerCase().includes(query.toLowerCase()) ||
      source.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredLocations = [
    { name: 'London', country: 'United Kingdom' },
    { name: 'Tokyo', country: 'Japan' },
    { name: 'Tashkent', country: 'Uzbekistan' },
    { name: 'New York', country: 'United States' },
    { name: 'São Paulo', country: 'Brazil' },
    { name: 'Nairobi', country: 'Kenya' },
    { name: 'Paris', country: 'France' },
    { name: 'Sydney', country: 'Australia' },
  ].filter((l) => l.name.toLowerCase().includes(query.toLowerCase()) || l.country.toLowerCase().includes(query.toLowerCase()));

  const handleSelectNav = (pageId: PageId) => {
    onNavigate(pageId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#090d16] border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-[#0b0f19]">
          <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Search parameters (PM2.5, NO2), pages, or data providers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="p-3 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Navigation Pages */}
          {filteredNav.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Modules & Views</span>
              </div>
              <div className="space-y-1">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className="w-full text-left px-2.5 py-2 rounded bg-slate-900/50 hover:bg-slate-800 text-slate-200 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Environmental Parameters */}
          {filteredParams.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>Environmental Parameters</span>
              </div>
              <div className="space-y-1">
                {filteredParams.slice(0, 6).map((param) => (
                  <button
                    key={param.code}
                    type="button"
                    onClick={() =>
                      handleSelectNav(param.category === 'air_quality' ? 'air-quality' : 'climate')
                    }
                    className="w-full text-left px-2.5 py-2 rounded bg-slate-900/50 hover:bg-slate-800 text-slate-200 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{param.code.toUpperCase()}</span>
                      <span className="text-slate-400 truncate max-w-xs">{param.name}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{param.unit}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data Sources */}
          {filteredSources.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Database className="w-3 h-3 text-cyan-400" />
                <span>Data Sources</span>
              </div>
              <div className="space-y-1">
                {filteredSources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => handleSelectNav('sources')}
                    className="w-full text-left px-2.5 py-2 rounded bg-slate-900/50 hover:bg-slate-800 text-slate-200 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-semibold">{source.shortCode}</span>
                      <span className="text-slate-300 truncate max-w-xs">{source.name}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{source.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Geographic Coordinates & Locations */}
          {filteredLocations.length > 0 && query.trim().length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Monitoring Locations</span>
              </div>
              <div className="space-y-1">
                {filteredLocations.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleSelectNav('overview')}
                    className="w-full text-left px-2.5 py-2 rounded bg-slate-900/50 hover:bg-slate-800 text-slate-200 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-semibold">{loc.name}</span>
                      <span className="text-slate-400">{loc.country}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">Jump to Overview</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredNav.length === 0 && filteredParams.length === 0 && filteredSources.length === 0 && (filteredLocations.length === 0 || query.trim().length === 0) && (
            <div className="text-center py-8 text-slate-500">
              No parameters, locations, or views matching "{query}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#07090e] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Press ESC or click outside to dismiss</span>
          <span>TERRAVISION INDEX</span>
        </div>
      </div>
    </div>
  );
};
