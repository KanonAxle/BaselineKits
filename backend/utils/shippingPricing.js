const FREE_SHIPPING_THRESHOLD_CENTS = 30000;
const SHIPPING_TIERS = [
  { below: 1500, cents: 299 },
  { below: 3000, cents: 499 },
  { below: 5000, cents: 799 },
  { below: 10000, cents: 999 },
  { below: FREE_SHIPPING_THRESHOLD_CENTS, cents: 1499 },
];

function calculateShippingCents(subtotalCents) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new Error('Merchandise subtotal must be a non-negative whole number of cents.');
  }

  const tier = SHIPPING_TIERS.find(({ below }) => subtotalCents < below);
  return tier ? tier.cents : 0;
}

module.exports = {
  FREE_SHIPPING_THRESHOLD_CENTS,
  calculateShippingCents,
};
