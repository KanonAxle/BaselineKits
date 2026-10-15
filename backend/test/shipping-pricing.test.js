const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateShippingCents } = require('../utils/shippingPricing');

test('charges the standard fee below the free-shipping threshold', () => {
  assert.equal(calculateShippingCents(29999), 1495);
  assert.equal(calculateShippingCents(0), 1495);
});

test('ships free when merchandise subtotal reaches the threshold', () => {
  assert.equal(calculateShippingCents(30000), 0);
  assert.equal(calculateShippingCents(45000), 0);
});

test('rejects invalid merchandise subtotals', () => {
  assert.throws(() => calculateShippingCents(-1), /non-negative/);
  assert.throws(() => calculateShippingCents(1.5), /whole number/);
});
