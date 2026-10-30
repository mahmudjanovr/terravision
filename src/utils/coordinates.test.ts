/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCoordinate,
  assertValidCoordinates,
  formatCoordinates,
  toDMS,
  calculateDistanceKm,
} from './coordinates';

test('isValidCoordinate accepts standard earthly coordinates', () => {
  assert.equal(isValidCoordinate(0, 0), true);
  assert.equal(isValidCoordinate(41.2995, 69.2401), true); // Tashkent
  assert.equal(isValidCoordinate(51.5074, -0.1278), true); // London
  assert.equal(isValidCoordinate(-90, 180), true); // exact boundary
  assert.equal(isValidCoordinate(90, -180), true); // exact boundary
  assert.equal(isValidCoordinate(-90, -180), true);
  assert.equal(isValidCoordinate(90, 180), true);
});

test('isValidCoordinate strictly rejects out-of-bounds coordinates without clamping', () => {
  assert.equal(isValidCoordinate(90.0001, 0), false);
  assert.equal(isValidCoordinate(-90.0001, 0), false);
  assert.equal(isValidCoordinate(0, 180.0001), false);
  assert.equal(isValidCoordinate(0, -180.0001), false);
  assert.equal(isValidCoordinate(1000, 0), false);
  assert.equal(isValidCoordinate(0, -500), false);
});

test('isValidCoordinate strictly rejects NaN, Infinity, null, and non-numeric types', () => {
  assert.equal(isValidCoordinate(NaN, 0), false);
  assert.equal(isValidCoordinate(0, NaN), false);
  assert.equal(isValidCoordinate(Infinity, 0), false);
  assert.equal(isValidCoordinate(0, -Infinity), false);
  assert.equal(isValidCoordinate(null as any, 0), false);
  assert.equal(isValidCoordinate(0, undefined as any), false);
  assert.equal(isValidCoordinate('40.7' as any, -74), false);
  assert.equal(isValidCoordinate({} as any, [] as any), false);
});

test('assertValidCoordinates passes valid inputs and throws on all malformed/out-of-range inputs', () => {
  // Valid
  assert.doesNotThrow(() => assertValidCoordinates(51.5074, -0.1278));
  assert.doesNotThrow(() => assertValidCoordinates(-90, -180));
  assert.doesNotThrow(() => assertValidCoordinates(90, 180));

  // Null / undefined
  assert.throws(() => assertValidCoordinates(null, 0), /Coordinates cannot be null or undefined/);
  assert.throws(() => assertValidCoordinates(0, undefined), /Coordinates cannot be null or undefined/);

  // Non-numeric
  assert.throws(() => assertValidCoordinates('51.5', -0.1), /Coordinates must be numeric/);

  // Non-finite
  assert.throws(() => assertValidCoordinates(Infinity, 0), /Coordinates must be finite numbers/);
  assert.throws(() => assertValidCoordinates(0, NaN), /Coordinates must be finite numbers/);

  // Out of bounds - verify no clamping occurred
  assert.throws(() => assertValidCoordinates(91, 0), /Latitude out of bounds.*Coordinate clamping is forbidden/);
  assert.throws(() => assertValidCoordinates(-90.5, 0), /Latitude out of bounds.*Coordinate clamping is forbidden/);
  assert.throws(() => assertValidCoordinates(0, 181), /Longitude out of bounds.*Coordinate clamping is forbidden/);
  assert.throws(() => assertValidCoordinates(0, -180.5), /Longitude out of bounds.*Coordinate clamping is forbidden/);
});

test('formatCoordinates formats decimal degrees with hemisphere indicators', () => {
  assert.equal(formatCoordinates(40.7128, -74.006, { decimals: 2 }), '40.71° N, 74.01° W');
  assert.equal(formatCoordinates(-33.8688, 151.2093, { decimals: 2 }), '33.87° S, 151.21° E');
  assert.equal(formatCoordinates(999, 999), 'Invalid Coordinates');
});

test('toDMS converts degrees to arc-degrees, minutes, and seconds', () => {
  const formatted = toDMS(40.7128, 'N');
  assert.match(formatted, /40°42'46" N/);
});

test('calculateDistanceKm computes distance accurately', () => {
  // Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522) is approx 343 km
  const dist = calculateDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
  assert.ok(dist > 330 && dist < 360, `Expected ~343km, got ${dist}`);
});
