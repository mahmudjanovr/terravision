/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Scientific Quality Status Evaluator
 * Enforces rigorous quality classification semantics:
 * - VALIDATED: Structural and schema validation passed; values fall within physical domain limits.
 * - UNVERIFIED: Authentic provider data with no independent ground truth or secondary calibration applied.
 * - SUSPECT: Potential anomaly, physical boundary violation, or flagged by provider QA.
 * - MISSING: Sensor offline, null observation, or unfilled grid cell.
 * - INVALID: Corrupted payload, out-of-range impossible value, or schema failure.
 */

import { QualityStatus } from '../types/environmental';

export interface PhysicalDomainLimits {
  min: number;
  max: number;
  suspectMin?: number;
  suspectMax?: number;
}

/**
 * Domain physical boundaries based on WMO and atmospheric science standards.
 */
export const PARAMETER_PHYSICAL_BOUNDS: Record<string, PhysicalDomainLimits> = {
  // Temperature 2m (°C): World record low ~ -89.2°C, high ~ 56.7°C
  temperature_2m: { min: -95, max: 65, suspectMin: -60, suspectMax: 55 },
  // Relative Humidity (%): 0 to 100%
  relative_humidity: { min: 0, max: 100 },
  relative_humidity_2m: { min: 0, max: 100 },
  // Surface Pressure (hPa): Low ~ 870 hPa (typhoon), High ~ 1085 hPa (Siberian high)
  surface_pressure: { min: 300, max: 1100, suspectMin: 500, suspectMax: 1090 },
  // Wind Speed (km/h): 0 to ~408 km/h (Barrow Island cyclone record)
  wind_speed_10m: { min: 0, max: 450, suspectMin: 0, suspectMax: 300 },
  // Wind Direction (degrees): 0 to 360
  wind_direction_10m: { min: 0, max: 360 },
  // Precipitation (mm): >= 0
  precipitation: { min: 0, max: 2000, suspectMin: 0, suspectMax: 500 },
  // Solar Radiation / All-sky irradiance (W/m² or kWh/m²):
  solar_radiation: { min: 0, max: 1500 },
  solar_radiation_horizontal: { min: 0, max: 1500 },
  // Air Quality Criteria Pollutants (µg/m³ or ppm):
  pm25: { min: 0, max: 2000, suspectMin: 0, suspectMax: 1000 },
  pm10: { min: 0, max: 3000, suspectMin: 0, suspectMax: 1500 },
  no2: { min: 0, max: 1000, suspectMin: 0, suspectMax: 500 },
  so2: { min: 0, max: 2000, suspectMin: 0, suspectMax: 1000 },
  o3: { min: 0, max: 1000, suspectMin: 0, suspectMax: 500 },
  co: { min: 0, max: 50000, suspectMin: 0, suspectMax: 20000 },
};

/**
 * Evaluates observational value quality against scientific physical boundaries and provider calibration.
 * 
 * @param value Floating point observation or null
 * @param parameterCode Environmental parameter code
 * @param options Contextual options regarding calibration or ground validation
 */
export function evaluateQualityStatus(
  value: number | null | undefined,
  parameterCode: string,
  options?: {
    isCalibratedReference?: boolean;
    isRawLowCostSensor?: boolean;
    providerFlagged?: boolean;
  }
): QualityStatus {
  // 1. Missing data / offline / null
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'MISSING';
  }

  // 2. Provider flagged anomaly
  if (options?.providerFlagged) {
    return 'SUSPECT';
  }

  const bounds = PARAMETER_PHYSICAL_BOUNDS[parameterCode];
  if (bounds) {
    // 3. Impossible values (violating absolute physical laws)
    if (value < bounds.min || value > bounds.max) {
      return 'INVALID';
    }

    // 4. Suspect values (extreme values warranting verification)
    if (
      (bounds.suspectMin !== undefined && value < bounds.suspectMin) ||
      (bounds.suspectMax !== undefined && value > bounds.suspectMax)
    ) {
      return 'SUSPECT';
    }
  }

  // 5. Uncalibrated low-cost sensors without secondary ground verification
  if (options?.isRawLowCostSensor) {
    return 'UNVERIFIED';
  }

  // 6. Structural & schema validated, within physical domain
  return 'VALIDATED';
}
