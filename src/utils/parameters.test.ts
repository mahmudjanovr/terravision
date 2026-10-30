/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { STANDARD_PARAMETERS, getParameterByCode, getParametersByCategory } from './parameters';

test('STANDARD_PARAMETERS contains essential air quality and climate parameters', () => {
  const codes = STANDARD_PARAMETERS.map((p) => p.code);
  assert.ok(codes.includes('pm25'), 'PM2.5 must exist');
  assert.ok(codes.includes('pm10'), 'PM10 must exist');
  assert.ok(codes.includes('no2'), 'NO2 must exist');
  assert.ok(codes.includes('temperature_2m'), 'Temperature must exist');
  assert.ok(codes.includes('relative_humidity'), 'Humidity must exist');
});

test('getParameterByCode retrieves parameter case-insensitively', () => {
  const pm25 = getParameterByCode('PM25');
  assert.ok(pm25);
  assert.equal(pm25?.unit, 'µg/m³');
  assert.equal(pm25?.chemicalFormula, 'PM₂.₅');
});

test('getParametersByCategory groups correctly', () => {
  const aq = getParametersByCategory('air_quality');
  assert.ok(aq.length >= 6);
  aq.forEach((item) => assert.equal(item.category, 'air_quality'));

  const climate = getParametersByCategory('climate');
  assert.ok(climate.length >= 4);
});
