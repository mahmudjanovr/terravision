/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapLibreViewer } from '../../components/maps/MapLibreViewer';
import { SectionHeader } from '../../components/common/SectionHeader';
import {
  useEnvironmentalData,
  GLOBAL_LOCATION_PRESETS,
} from '../../hooks/useEnvironmentalData';
import { MonitoringStation } from '../../types/environmental';
import {
  Search,
  MapPin,
  Layers,
  Info,
  ShieldCheck,
  Compass,
  Radio,
  X,
  RefreshCw,
} from 'lucide-react';
import { BASEMAP_OPTIONS } from '../../config/appConfig';

export const EnvironmentalMapPage: React.FC = () => {
  const {
    selectedLocation,
    stations,
    selectedStation,
    stationObservations,
    selectStation,
    changeLocation,
    isLoading,
    refreshAll,
  } = useEnvironmentalData();

  const [basemapUrl, setBasemapUrl] = useState(BASEMAP_OPTIONS[0].styleUrl);
  const [stationPanelOpen, setStationPanelOpen] = useState(false);

  const handleStationClick = (stn: MonitoringStation) => {
    selectStation(stn);
    setStationPanelOpen(true);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      {/* Top Header */}
      <div className="shrink-0">
        <SectionHeader
          title="Geospatial Intelligence Map"
          subtitle="MapLibre GL vector engine rendering global cartography, real-time coordinate inspection, and live OpenAQ sensor stations."
          badge="Vector Engine Active"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-xs font-mono text-slate-300">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Geographic Hub:</span>
                <select
                  value={selectedLocation.name}
                  onChange={(e) => {
                    const loc = GLOBAL_LOCATION_PRESETS.find((l) => l.name === e.target.value);
                    if (loc) changeLocation(loc);
                  }}
                  className="bg-transparent focus:outline-none cursor-pointer text-cyan-300 font-bold pr-1"
                  aria-label="Select geographic hub"
                >
                  {GLOBAL_LOCATION_PRESETS.map((hub) => (
                    <option key={hub.name} value={hub.name} className="bg-slate-900">
                      {hub.name}, {hub.country}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={refreshAll}
                disabled={isLoading}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded cursor-pointer"
                title="Refresh geospatial stations"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          }
        />
      </div>

      {/* Map Control Toolbar */}
      <div className="shrink-0 p-3 bg-[#0c1019] border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 font-mono text-slate-300">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Radio className="w-3.5 h-3.5" />
            <span>{stations.length} OpenAQ Stations Ingested</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            Center: {selectedLocation.latitude.toFixed(4)}° N, {selectedLocation.longitude.toFixed(4)}° E
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>MapLibre GL v5.1 Vector</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>No Artificial Heatmaps</span>
          </span>
        </div>
      </div>

      {/* Main Full-Bleed Map Viewport */}
      <div className="flex-1 w-full rounded-lg overflow-hidden border border-slate-800 relative min-h-[460px]">
        <MapLibreViewer
          initialStyleUrl={basemapUrl}
          showControls={true}
          showLayerPanel={true}
          stations={stations}
          onSelectStation={handleStationClick}
          targetCenter={[selectedLocation.longitude, selectedLocation.latitude]}
          className="h-full"
        />

        {/* Station Inspection Drawer Panel (Overlay) */}
        {stationPanelOpen && selectedStation && (
          <div className="absolute top-4 left-4 z-20 w-80 bg-[#090d16]/95 backdrop-blur-md border border-slate-700 rounded-lg p-4 shadow-2xl text-xs space-y-3">
            <div className="flex items-start justify-between pb-2 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  MONITORING STATION
                </div>
                <h4 className="font-bold text-slate-100 text-sm mt-0.5 truncate max-w-[200px]">
                  {selectedStation.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setStationPanelOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">OPERATOR:</span>
                <span className="truncate max-w-[150px]">{selectedStation.operator || 'Official Network'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">COORDINATES:</span>
                <span>
                  {selectedStation.location.latitude.toFixed(4)}°, {selectedStation.location.longitude.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LAST REPORT:</span>
                <span>{selectedStation.lastReportedAt ? new Date(selectedStation.lastReportedAt).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>

            {/* Sensor parameters */}
            <div>
              <div className="text-[10px] font-mono text-slate-400 mb-1.5">SENSORS INSTALLED</div>
              <div className="flex flex-wrap gap-1">
                {selectedStation.parametersMonitored.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] font-mono bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 px-2 py-0.5 rounded"
                  >
                    {p.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Latest sensor values */}
            {stationObservations.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="text-[10px] font-mono text-slate-400">LATEST OBSERVATIONS</div>
                {stationObservations.map((obs) => (
                  <div key={obs.id} className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-400 uppercase">{obs.parameter}:</span>
                    <span className="font-bold text-slate-100">
                      {obs.value !== null ? obs.value.toFixed(1) : '--'} {obs.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Information Drawer Footer */}
      <div className="shrink-0 p-3 bg-[#090d16] border border-slate-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Click on any station marker to inspect ground-level telemetry. No artificial interpolation or fake heatmaps.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          PROJECTION: EPSG:3857 · VECTOR ENGINE
        </div>
      </div>
    </div>
  );
};
