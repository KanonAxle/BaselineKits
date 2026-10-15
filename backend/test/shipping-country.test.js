const test = require('node:test');
const assert = require('node:assert/strict');
const { isUsShippingCountry } = require('../utils/shippingCountry');

test('accepts supported U.S. country code and name formats', () => {
  for (const country of ['US', 'us', 'USA', 'United States', ' United States of America ']) {
    assert.equal(isUsShippingCountry(country), true, country);
  }
});

test('treats a missing country as U.S. for the U.S.-only checkout form', () => {
  assert.equal(isUsShippingCountry(undefined), true);
  assert.equal(isUsShippingCountry(null), true);
});

test('rejects non-U.S. and malformed country values', () => {
  for (const country of ['CA', 'Canada', '', 840, {}]) {
    assert.equal(isUsShippingCountry(country), false, String(country));
  }
});
