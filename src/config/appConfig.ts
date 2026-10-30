/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BasemapOption } from '../types/map';
import { NavItem } from '../types/navigation';

export const APP_CONFIG = {
  name: 'TERRAVISION',
  tagline: 'Understand the planet. Visualize the change.',
  version: '2.0.0-phase2',
  phase: 'Phase 2: Real-World Data Integration',
  mission: 'Global ecological monitoring through reliable real-world data, interactive geospatial visualization, and transparent data sources.',
  defaultBasemapId: 'carto-dark',
  defaultView: {
    center: [15, 20] as [number, number], // [lng, lat] centered globally
    zoom: 1.8,
    pitch: 0,
    bearing: 0,
  },
};

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: 'carto-dark',
    name: 'Carto Dark Matter',
    provider: 'CARTO / OpenStreetMap',
    styleUrl: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    description: 'Minimalist dark vector basemap designed for high-contrast environmental telemetry and scientific layers.',
    isDark: true,
  },
  {
    id: 'carto-positron',
    name: 'Carto Positron Light',
    provider: 'CARTO / OpenStreetMap',
    styleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    description: 'Clean monochrome light basemap for daytime analysis and report generation.',
    isDark: false,
  },
  {
    id: 'demotiles',
    name: 'MapLibre Vector World',
    provider: 'MapLibre GL Community',
    styleUrl: 'https://demotiles.maplibre.org/style.json',
    description: 'Reliable vector test style with global country boundaries and topography.',
    isDark: true,
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Global Overview',
    shortLabel: 'Overview',
    iconName: 'Globe',
    description: 'Platform summary, global status, and key monitoring modules',
  },
  {
    id: 'air-quality',
    label: 'Air Quality',
    shortLabel: 'Air Quality',
    iconName: 'Wind',
    description: 'PM2.5, PM10, NO2, SO2, O3, and CO ground & satellite monitoring',
  },
  {
    id: 'climate',
    label: 'Climate & Atmosphere',
    shortLabel: 'Climate',
    iconName: 'Thermometer',
    description: 'Temperature, humidity, precipitation, and barometric pressure',
  },
  {
    id: 'map',
    label: 'Environmental Map',
    shortLabel: 'Global Map',
    iconName: 'Map',
    description: 'Interactive geospatial viewport with configurable basemaps and layers',
  },
  {
    id: 'analytics',
    label: 'Historical Analytics',
    shortLabel: 'Analytics',
    iconName: 'BarChart3',
    description: 'Multi-parameter time-series and comparative environmental analysis',
  },
  {
    id: 'research',
    label: 'Research Explorer',
    shortLabel: 'Research',
    iconName: 'Search',
    description: 'Structured queries by geographic coordinates, parameters, and time',
  },
  {
    id: 'sources',
    label: 'Data Sources',
    shortLabel: 'Data Sources',
    iconName: 'Database',
    description: 'Provider registry, API integration readiness, and synchronization contracts',
    badge: '5 Providers',
  },
  {
    id: 'settings',
    label: 'Platform Settings',
    shortLabel: 'Settings',
    iconName: 'Sliders',
    description: 'Basemap styles, measurement units, and local preferences',
  },
];
