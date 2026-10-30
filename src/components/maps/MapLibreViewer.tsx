/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { BASEMAP_OPTIONS, APP_CONFIG } from '../../config/appConfig';
import { MapLayerConfig } from '../../types/map';
import { MonitoringStation } from '../../types/environmental';
import { formatCoordinates } from '../../utils/coordinates';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  SlidersHorizontal,
  Info,
  Radio,
} from 'lucide-react';

interface MapLibreViewerProps {
  initialStyleUrl?: string;
  className?: string;
  showControls?: boolean;
  showLayerPanel?: boolean;
  stations?: MonitoringStation[];
  onSelectStation?: (station: MonitoringStation) => void;
  targetCenter?: [number, number]; // [lng, lat]
}

const DEFAULT_LAYERS: MapLayerConfig[] = [
  {
    id: 'layer-ground-stations',
    name: 'Ground Monitoring Stations',
    category: 'stations',
    enabled: true,
    opacity: 1.0,
    description: 'Terrestrial sensor coordinates from OpenAQ registry',
    requiresDataSource: 'OpenAQ',
  },
  {
    id: 'layer-tropospheric-no2',
    name: 'Tropospheric NO₂ Column',
    category: 'atmospheric',
    enabled: false,
    opacity: 0.7,
    description: 'Level-2 total vertical column density from Sentinel-5P TROPOMI',
    requiresDataSource: 'Copernicus Data Space',
  },
  {
    id: 'layer-surface-temperature',
    name: 'Surface Air Temperature Grid',
    category: 'surface',
    enabled: false,
    opacity: 0.6,
    description: 'High-resolution reanalysis mesh from Open-Meteo / ERA5',
    requiresDataSource: 'Open-Meteo',
  },
];

export const MapLibreViewer: React.FC<MapLibreViewerProps> = ({
  initialStyleUrl,
  className = '',
  showControls = true,
  showLayerPanel = true,
  stations = [],
  onSelectStation,
  targetCenter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [currentStyle, setCurrentStyle] = useState<string>(
    initialStyleUrl || BASEMAP_OPTIONS[0].styleUrl
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: targetCenter ? targetCenter[1] : APP_CONFIG.defaultView.center[1],
    lng: targetCenter ? targetCenter[0] : APP_CONFIG.defaultView.center[0],
  });
  const [zoomLevel, setZoomLevel] = useState<number>(APP_CONFIG.defaultView.zoom);
  const [layers, setLayers] = useState<MapLayerConfig[]>(DEFAULT_LAYERS);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState<boolean>(false);
  const [hasMapError, setHasMapError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fly to target center if changed
  useEffect(() => {
    if (!mapRef.current || !targetCenter) return;
    mapRef.current.flyTo({
      center: targetCenter,
      zoom: 6,
      duration: 1800,
    });
  }, [targetCenter]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const initialCenter: [number, number] = targetCenter || APP_CONFIG.defaultView.center;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: currentStyle,
        center: initialCenter,
        zoom: targetCenter ? 5 : APP_CONFIG.defaultView.zoom,
        pitch: APP_CONFIG.defaultView.pitch,
        bearing: APP_CONFIG.defaultView.bearing,
        attributionControl: false,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('mousemove', (e) => {
        setCoords({
          lat: Math.round(e.lngLat.lat * 10000) / 10000,
          lng: Math.round(e.lngLat.lng * 10000) / 10000,
        });
      });

      map.on('zoom', () => {
        setZoomLevel(Math.round(map.getZoom() * 10) / 10);
      });

      map.on('error', (e) => {
        if (e.error?.message?.includes('Failed to fetch') || e.error?.message?.includes('401')) {
          console.warn('Map tile notice:', e.error.message);
        }
      });

      mapRef.current = map;

      return () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        map.remove();
        mapRef.current = null;
      };
    } catch (err: any) {
      console.error('MapLibre GL initialization error:', err);
      setHasMapError(true);
      setErrorMessage(err?.message || 'WebGL acceleration not available or tile style inaccessible.');
    }
  }, [currentStyle]);

  // Update Markers when stations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const groundLayerActive = layers.find((l) => l.id === 'layer-ground-stations')?.enabled;
    if (!groundLayerActive) return;

    stations.forEach((stn) => {
      if (!stn.location.latitude || !stn.location.longitude) return;

      // Custom DOM Marker element
      const el = document.createElement('div');
      el.className = 'group relative flex items-center justify-center cursor-pointer';
      el.innerHTML = `
        <div class="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-slate-900 shadow-lg shadow-cyan-500/50 group-hover:scale-125 transition-transform"></div>
        <div class="absolute -top-1 -left-1 w-5.5 h-5.5 rounded-full bg-cyan-400/20 animate-ping pointer-events-none"></div>
      `;

      // Popup
      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
        <div class="text-xs font-mono space-y-1 p-1">
          <div class="font-bold text-cyan-400 text-sm truncate">${stn.name}</div>
          <div class="text-slate-400">${stn.operator || 'OpenAQ Ground Station'}</div>
          <div class="text-slate-500 pt-1 text-[10px]">
            Coords: ${stn.location.latitude.toFixed(4)}, ${stn.location.longitude.toFixed(4)}
          </div>
          <div class="text-[10px] text-slate-300">
            Monitors: ${stn.parametersMonitored.slice(0, 4).join(', ') || 'Various'}
          </div>
        </div>
      `);

      el.addEventListener('click', () => {
        if (onSelectStation) {
          onSelectStation(stn);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stn.location.longitude, stn.location.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [stations, layers, onSelectStation]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetView = () => {
    mapRef.current?.flyTo({
      center: APP_CONFIG.defaultView.center,
      zoom: APP_CONFIG.defaultView.zoom,
      pitch: 0,
      bearing: 0,
    });
  };

  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, enabled: !l.enabled } : l))
    );
  };

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-lg overflow-hidden border border-slate-800 bg-[#07090e] ${className}`}
    >
      {/* Map Container */}
      {!hasMapError ? (
        <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />
      ) : (
        <div className="w-full h-full min-h-[420px] flex flex-col items-center justify-center p-8 text-center bg-[#090d16]">
          <Compass className="w-10 h-10 text-cyan-400 mb-3 opacity-60" />
          <h4 className="text-base font-semibold text-slate-200">Map Viewport Configured</h4>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
            {errorMessage || 'MapLibre GL initialized with vector basemap fallback. Verify local network or WebGL.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setHasMapError(false);
              setCurrentStyle(BASEMAP_OPTIONS[2].styleUrl);
            }}
            className="px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 text-cyan-300 rounded hover:bg-slate-800 cursor-pointer"
          >
            Switch to Public Vector Demo Basemap
          </button>
        </div>
      )}

      {/* Floating Coordinate Probe HUD (Top Left) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#090d16]/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded text-xs font-mono text-slate-300 shadow-lg">
        <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="tabular-nums">
          {formatCoordinates(coords.lat, coords.lng, { decimals: 4 })}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Z: {zoomLevel.toFixed(1)}</span>
        {stations.length > 0 && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <Radio className="w-3 h-3" />
              <span>{stations.length} Stations</span>
            </span>
          </>
        )}
      </div>

      {/* Map Control Buttons (Top Right) */}
      {showControls && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <div className="flex flex-col bg-[#090d16]/90 backdrop-blur-md border border-slate-800 rounded overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-slate-800" />
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetView}
            className="p-2 bg-[#090d16]/90 backdrop-blur-md border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded shadow-lg transition-colors cursor-pointer"
            title="Reset to Global Extent"
            aria-label="Reset global view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {showLayerPanel && (
            <button
              type="button"
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`p-2 backdrop-blur-md border rounded shadow-lg transition-colors cursor-pointer ${
                isLayerMenuOpen
                  ? 'bg-cyan-950/80 border-cyan-800 text-cyan-400'
                  : 'bg-[#090d16]/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
              title="Environmental Layers"
              aria-label="Toggle environmental layers"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            className={`p-2 backdrop-blur-md border rounded shadow-lg transition-colors cursor-pointer ${
              isStyleMenuOpen
                ? 'bg-cyan-950/80 border-cyan-800 text-cyan-400'
                : 'bg-[#090d16]/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Basemap Style Selector"
            aria-label="Select basemap style"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Layer Control Drawer Overlay */}
      {isLayerMenuOpen && (
        <div className="absolute top-14 right-3 z-20 w-72 bg-[#0c1019]/95 backdrop-blur-md border border-slate-800 rounded-lg p-3.5 shadow-xl text-xs">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Environmental Layers
            </span>
            <button
              type="button"
              onClick={() => setIsLayerMenuOpen(false)}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className="p-2 rounded bg-slate-900/60 border border-slate-800/80"
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={layer.enabled}
                      onChange={() => toggleLayer(layer.id)}
                      className="accent-cyan-500 rounded cursor-pointer"
                    />
                    <span className="font-medium text-slate-200 truncate">{layer.name}</span>
                  </label>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 pl-5">
                  {layer.description}
                </div>
                <div className="mt-1.5 pl-5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Feed: {layer.requiresDataSource}</span>
                  <span className={layer.id === 'layer-ground-stations' && stations.length > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                    {layer.id === 'layer-ground-stations' && stations.length > 0
                      ? `${stations.length} Active`
                      : 'Live Query'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Real OpenAQ stations render as cyan point markers.</span>
          </div>
        </div>
      )}

      {/* Style Selector Drawer Overlay */}
      {isStyleMenuOpen && (
        <div className="absolute top-26 right-3 z-20 w-64 bg-[#0c1019]/95 backdrop-blur-md border border-slate-800 rounded-lg p-3 shadow-xl text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200">Basemap Style</span>
            <button
              type="button"
              onClick={() => setIsStyleMenuOpen(false)}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            {BASEMAP_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCurrentStyle(opt.styleUrl);
                  setIsStyleMenuOpen(false);
                }}
                className={`w-full text-left p-2 rounded transition-colors flex flex-col cursor-pointer ${
                  currentStyle === opt.styleUrl
                    ? 'bg-slate-800 text-cyan-400 font-medium border border-slate-700'
                    : 'text-slate-300 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{opt.name}</span>
                  {currentStyle === opt.styleUrl && <span className="text-[10px] font-mono">ACTIVE</span>}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">{opt.provider}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Status Ribbon */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-[#090d16]/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded text-[11px] text-slate-400 shadow-lg">
        <span className="flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>PROJECTION: EPSG:3857 (Web Mercator)</span>
        </span>
        <span className="hidden sm:inline text-slate-600">·</span>
        <span className="hidden sm:inline font-mono">
          BASEMAP: {BASEMAP_OPTIONS.find((b) => b.styleUrl === currentStyle)?.name || 'Custom Vector'}
        </span>
      </div>
    </div>
  );
};
