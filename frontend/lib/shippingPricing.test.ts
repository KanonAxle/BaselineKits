import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { calculateShippingCents } from './shippingPricing.ts';

const require = createRequire(import.meta.url);
const backend: { calculateShippingCents: (subtotal: number) => number } = require('../../backend/utils/shippingPricing.js');

test('frontend and backend shipping match at each tier boundary', () => {
  for (const [subtotal, expected] of [
    [0, 299], [1499, 299], [1500, 499], [2999, 499],
    [3000, 799], [4999, 799], [5000, 999], [9999, 999],
    [10000, 1499], [29999, 1499], [30000, 0], [45000, 0],
  ]) {
    assert.equal(calculateShippingCents(subtotal), expected, `frontend subtotal ${subtotal}`);
    assert.equal(backend.calculateShippingCents(subtotal), expected, `backend subtotal ${subtotal}`);
  }
});

test('frontend rejects invalid subtotals', () => {
  for (const value of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => calculateShippingCents(value), /non-negative whole number/);
  }
});
