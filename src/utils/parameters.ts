/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Environmental Parameter Definitions and Registry
 * Standardized parameters according to WHO, WMO, and Copernicus guidelines.
 */

import { EnvironmentalParameter } from '../types/environmental';

export const STANDARD_PARAMETERS: EnvironmentalParameter[] = [
  {
    code: 'pm25',
    name: 'Fine Particulate Matter (PM2.5)',
    chemicalFormula: 'PM₂.₅',
    unit: 'µg/m³',
    category: 'air_quality',
    description: 'Atmospheric particulate matter that have a diameter of less than 2.5 micrometers.',
    standardReference: 'WHO Global Air Quality Guidelines 2021',
    precisionDecimals: 1,
  },
  {
    code: 'pm10',
    name: 'Coarse Particulate Matter (PM10)',
    chemicalFormula: 'PM₁₀',
    unit: 'µg/m³',
    category: 'air_quality',
    description: 'Inhalable particles, with diameters that are generally 10 micrometers and smaller.',
    standardReference: 'WHO Global Air Quality Guidelines 2021',
    precisionDecimals: 1,
  },
  {
    code: 'no2',
    name: 'Nitrogen Dioxide',
    chemicalFormula: 'NO₂',
    unit: 'µg/m³',
    category: 'air_quality',
    description: 'Toxic gas generated primarily from vehicle combustion and industrial emissions.',
    standardReference: 'WHO Guideline Value',
    precisionDecimals: 1,
  },
  {
    code: 'so2',
    name: 'Sulfur Dioxide',
    chemicalFormula: 'SO₂',
    unit: 'µg/m³',
    category: 'air_quality',
    description: 'Emitted from burning fossil fuels containing sulfur and volcanic eruptions.',
    standardReference: 'WHO Guideline Value',
    precisionDecimals: 1,
  },
  {
    code: 'o3',
    name: 'Tropospheric Ozone',
    chemicalFormula: 'O₃',
    unit: 'µg/m³',
    category: 'air_quality',
    description: 'Secondary photochemical pollutant formed by sunlight reacting with NOx and VOCs.',
    standardReference: 'WHO Guideline Value',
    precisionDecimals: 1,
  },
  {
    code: 'co',
    name: 'Carbon Monoxide',
    chemicalFormula: 'CO',
    unit: 'mg/m³',
    category: 'air_quality',
    description: 'Colorless, odorless poisonous gas released by incomplete fuel combustion.',
    standardReference: 'WHO Guideline Value',
    precisionDecimals: 2,
  },
  {
    code: 'temperature_2m',
    name: 'Surface Air Temperature',
    chemicalFormula: 'T₂ₘ',
    unit: '°C',
    category: 'climate',
    description: 'Air temperature measured at 2 meters above surface level.',
    standardReference: 'WMO Guide to Instruments and Methods of Observation',
    precisionDecimals: 1,
  },
  {
    code: 'relative_humidity',
    name: 'Relative Humidity',
    chemicalFormula: 'RH',
    unit: '%',
    category: 'climate',
    description: 'Ratio of current vapor pressure to saturated vapor pressure at current temperature.',
    standardReference: 'WMO Standard',
    precisionDecimals: 0,
  },
  {
    code: 'wind_speed_10m',
    name: 'Wind Speed at 10m',
    chemicalFormula: 'u₁₀',
    unit: 'm/s',
    category: 'climate',
    description: 'Horizontal wind velocity at 10 meters above ground level.',
    standardReference: 'WMO Standard',
    precisionDecimals: 1,
  },
  {
    code: 'wind_direction_10m',
    name: 'Wind Direction at 10m',
    chemicalFormula: 'θ₁₀',
    unit: '°',
    category: 'climate',
    description: 'Direction from which wind originates at 10 meters above surface level, measured clockwise from true north.',
    standardReference: 'WMO Standard',
    precisionDecimals: 0,
  },
  {
    code: 'precipitation',
    name: 'Precipitation Rate',
    chemicalFormula: 'P',
    unit: 'mm',
    category: 'climate',
    description: 'Liquid and frozen water that forms in the atmosphere and falls back to the Earth.',
    standardReference: 'WMO Standard',
    precisionDecimals: 1,
  },
  {
    code: 'surface_pressure',
    name: 'Atmospheric Surface Pressure',
    chemicalFormula: 'pₛ',
    unit: 'hPa',
    category: 'climate',
    description: 'Barometric pressure exerted by the weight of air in the atmosphere.',
    standardReference: 'WMO Standard',
    precisionDecimals: 1,
  },
  {
    code: 'solar_radiation',
    name: 'Surface Solar Radiation',
    chemicalFormula: 'SSRD',
    unit: 'W/m²',
    category: 'radiation',
    description: 'Downward shortwave radiation reaching the Earth horizontal surface.',
    standardReference: 'NASA POWER Specification',
    precisionDecimals: 1,
  },
];

export function getParameterByCode(code: string): EnvironmentalParameter | undefined {
  return STANDARD_PARAMETERS.find((p) => p.code.toLowerCase() === code.toLowerCase());
}

export function getParametersByCategory(category: string): EnvironmentalParameter[] {
  return STANDARD_PARAMETERS.filter((p) => p.category === category);
}
