/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Geographic coordinate utilities for TERRAVISION
 * Pure mathematical functions for coordinates, formatting, and validation.
 */

export interface CoordinateFormatOptions {
  decimals?: number;
  format?: 'dd' | 'dms';
}

/**
 * Validates that latitude is in [-90, 90] and longitude is in [-180, 180].
 * Rejects NaN, Infinity, null, undefined, strings, and out-of-bounds coordinates.
 * Does NOT clamp values.
 */
export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Asserts that latitude and longitude are valid earthly coordinates.
 * Throws a descriptive Error on any malformed or out-of-range value.
 * Never silently clamps coordinates.
 */
export function assertValidCoordinates(latitude: unknown, longitude: unknown): void {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    throw new Error('Coordinates cannot be null or undefined.');
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error(`Coordinates must be numeric types. Received: lat=${String(latitude)}, lon=${String(longitude)}`);
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Coordinates must be finite numbers (received Infinity or NaN): lat=${latitude}, lon=${longitude}`);
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error(`Latitude out of bounds [-90, +90]: ${latitude}. Coordinate clamping is forbidden.`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error(`Longitude out of bounds [-180, +180]: ${longitude}. Coordinate clamping is forbidden.`);
  }
}

/**
 * Formats a decimal degree coordinate into human-readable scientific notation.
 * e.g., 40.7128, -74.0060 -> "40.7128° N, 74.0060° W"
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  options: CoordinateFormatOptions = {}
): string {
  if (!isValidCoordinate(latitude, longitude)) {
    return 'Invalid Coordinates';
  }

  const decimals = options.decimals ?? 4;
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';

  if (options.format === 'dms') {
    const latDms = toDMS(latitude, latDir);
    const lngDms = toDMS(longitude, lngDir);
    return `${latDms}, ${lngDms}`;
  }

  return `${Math.abs(latitude).toFixed(decimals)}° ${latDir}, ${Math.abs(longitude).toFixed(decimals)}° ${lngDir}`;
}

/**
 * Converts decimal degrees to Degrees Minutes Seconds (DMS).
 */
export function toDMS(degrees: number, direction: 'N' | 'S' | 'E' | 'W'): string {
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const minFloat = (abs - d) * 60;
  const m = Math.floor(minFloat);
  const s = Math.round((minFloat - m) * 60);

  return `${d}°${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}" ${direction}`;
}

/**
 * Calculates great circle distance between two points in kilometers (Haversine formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}
