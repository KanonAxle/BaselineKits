export const FREE_SHIPPING_THRESHOLD_CENTS = 30000;
export const STANDARD_SHIPPING_CENTS = 1495;

export function calculateShippingCents(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
}
