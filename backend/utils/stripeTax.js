function isStripeTaxEnabled(value = process.env.STRIPE_TAX_ENABLED) {
  return value === 'true';
}

function buildStripeTaxSessionParams(shippingCents) {
  if (!Number.isSafeInteger(shippingCents) || shippingCents < 0) {
    throw new RangeError('Shipping amount must be a non-negative integer number of cents');
  }

  return {
    automatic_tax: { enabled: true },
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: shippingCents, currency: 'usd' },
        tax_behavior: 'exclusive',
        display_name: shippingCents === 0 ? 'Free shipping' : 'Shipping',
      },
    }],
  };
}

function formatStripeShippingAddress(shippingDetails) {
  const address = shippingDetails?.address;
  if (
    address?.country !== 'US' ||
    !address.line1 ||
    !address.city ||
    !address.state ||
    !address.postal_code
  ) {
    throw new Error('Stripe Checkout did not return a complete U.S. shipping address');
  }

  return [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postal_code}`,
    address.country,
  ].filter(Boolean).join(', ');
}

module.exports = {
  isStripeTaxEnabled,
  buildStripeTaxSessionParams,
  formatStripeShippingAddress,
};
