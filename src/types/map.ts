/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BasemapOption {
  id: string;
  name: string;
  provider: string;
  styleUrl: string;
  description: string;
  isDark: boolean;
}

export interface MapLayerConfig {
  id: string;
  name: string;
  category: 'atmospheric' | 'surface' | 'boundaries' | 'stations';
  enabled: boolean;
  opacity: number;
  description: string;
  requiresDataSource: string;
}

export interface MapViewState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}
