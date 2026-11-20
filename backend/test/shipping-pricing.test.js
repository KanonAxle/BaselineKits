const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateShippingCents } = require('../utils/shippingPricing');

test('charges the configured fee at every tier boundary', () => {
  for (const [subtotal, expected] of [
    [0, 299], [1499, 299], [1500, 499], [2999, 499],
    [3000, 799], [4999, 799], [5000, 999], [9999, 999],
    [10000, 1499], [29999, 1499], [30000, 0],
  ]) {
    assert.equal(calculateShippingCents(subtotal), expected, `subtotal ${subtotal}`);
  }
});

test('ships free when merchandise subtotal reaches the threshold', () => {
  assert.equal(calculateShippingCents(30000), 0);
  assert.equal(calculateShippingCents(45000), 0);
});

test('rejects invalid merchandise subtotals', () => {
  assert.throws(() => calculateShippingCents(-1), /non-negative/);
  assert.throws(() => calculateShippingCents(1.5), /whole number/);
});
