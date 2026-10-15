const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isStripeTaxEnabled,
  buildStripeTaxSessionParams,
  formatStripeShippingAddress,
} = require('../utils/stripeTax');

test('Stripe Tax is enabled only by the explicit true setting', () => {
  assert.equal(isStripeTaxEnabled('true'), true);
  assert.equal(isStripeTaxEnabled(undefined), false);
  assert.equal(isStripeTaxEnabled('false'), false);
  assert.equal(isStripeTaxEnabled('TRUE'), false);
});

test('Stripe Tax checkout collects U.S. shipping and charges the configured flat rate', () => {
  assert.deepEqual(buildStripeTaxSessionParams(1495), {
    automatic_tax: { enabled: true },
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 1495, currency: 'usd' },
        tax_behavior: 'exclusive',
        display_name: 'Shipping',
      },
    }],
  });
});

test('Stripe Tax checkout represents the threshold shipping amount as free shipping', () => {
  const params = buildStripeTaxSessionParams(0);
  assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount, 0);
  assert.equal(params.shipping_options[0].shipping_rate_data.display_name, 'Free shipping');
});

test('Stripe Tax shipping amount must be a non-negative whole number of cents', () => {
  assert.throws(() => buildStripeTaxSessionParams(-1), RangeError);
  assert.throws(() => buildStripeTaxSessionParams(14.95), RangeError);
});

test('Stripe-confirmed U.S. shipping address is saved in the order', () => {
  assert.equal(formatStripeShippingAddress({
    address: {
      line1: '123 Main St',
      line2: 'Apt 4',
      city: 'Denver',
      state: 'CO',
      postal_code: '80202',
      country: 'US',
    },
  }), '123 Main St, Apt 4, Denver, CO 80202, US');
});

test('incomplete or non-U.S. Stripe shipping addresses are rejected', () => {
  assert.throws(() => formatStripeShippingAddress(null), /complete U\.S\. shipping address/);
  assert.throws(() => formatStripeShippingAddress({
    address: { line1: '123 Main St', country: 'CA' },
  }), /complete U\.S\. shipping address/);
});
