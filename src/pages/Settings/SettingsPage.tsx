/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SectionHeader } from '../../components/common/SectionHeader';
import { BASEMAP_OPTIONS } from '../../config/appConfig';
import { Sliders, Map, Key, Database, ShieldCheck, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [selectedBasemap, setSelectedBasemap] = useState(BASEMAP_OPTIONS[0].id);
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [coordFormat, setCoordFormat] = useState<'dd' | 'dms'>('dd');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <SectionHeader
        title="Platform Settings & Preferences"
        subtitle="Configure visualization basemaps, measurement units, and ingestion credentials for Phase 2 pipeline deployment."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basemap Selection */}
        <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Map className="w-4 h-4 text-cyan-400" />
            <span>Default Basemap Cartography</span>
          </div>
          <p className="text-xs text-slate-400">
            Select the default vector tile styling used across the global environmental viewport.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BASEMAP_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBasemap(b.id)}
                className={`p-3.5 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                  selectedBasemap === b.id
                    ? 'bg-slate-900 border-cyan-500/80 text-cyan-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{b.name}</span>
                    {selectedBasemap === b.id && (
                      <span className="text-[10px] font-mono text-cyan-400">DEFAULT</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{b.provider}</div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 line-clamp-2">{b.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Measurement Units */}
        <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Display & Unit Preferences</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1.5">TEMPERATURE SCALE</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTempUnit('celsius')}
                  className={`flex-1 py-1.5 px-3 rounded border text-center transition-colors ${
                    tempUnit === 'celsius'
                      ? 'bg-slate-900 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Celsius (°C) [WMO Standard]
                </button>
                <button
                  type="button"
                  onClick={() => setTempUnit('fahrenheit')}
                  className={`flex-1 py-1.5 px-3 rounded border text-center transition-colors ${
                    tempUnit === 'fahrenheit'
                      ? 'bg-slate-900 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Fahrenheit (°F)
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5">COORDINATE NOTATION</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCoordFormat('dd')}
                  className={`flex-1 py-1.5 px-3 rounded border text-center transition-colors ${
                    coordFormat === 'dd'
                      ? 'bg-slate-900 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Decimal Degrees (41.2995° N)
                </button>
                <button
                  type="button"
                  onClick={() => setCoordFormat('dms')}
                  className={`flex-1 py-1.5 px-3 rounded border text-center transition-colors ${
                    coordFormat === 'dms'
                      ? 'bg-slate-900 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  DMS (41°17'58" N)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2 Credentials Preparation */}
        <div className="border border-slate-800/80 bg-[#0b0f19] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Phase 2 Ingestion Credentials (Preview)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            API keys will be configured server-side through environment variables once the FastAPI + PostgreSQL backend is deployed in Phase 3.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-slate-500 block mb-1">OPENAQ API KEY (OPTIONAL TIER 2)</label>
              <input
                type="password"
                disabled
                placeholder="Configured via .env in Phase 2"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">COPERNICUS CDS API TOKEN</label>
              <input
                type="password"
                disabled
                placeholder="Configured via .env in Phase 2"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Save Preferences Button */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            {savedSuccess ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Preferences saved locally.</span>
              </span>
            ) : (
              <span>Preferences apply to the client session.</span>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded transition-colors cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
