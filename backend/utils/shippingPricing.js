const FREE_SHIPPING_THRESHOLD_CENTS = 30000;
const STANDARD_SHIPPING_CENTS = 1495;

function calculateShippingCents(subtotalCents) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new Error('Merchandise subtotal must be a non-negative whole number of cents.');
  }

  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
}

module.exports = {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
  calculateShippingCents,
};
