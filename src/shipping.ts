import type { Cents } from "./money";

export const STANDARD_SHIPPING: Cents = 599;
/** Orders above this amount (after discounts) ship free. */
export const FREE_SHIPPING_THRESHOLD: Cents = 5_000;

export function shippingFee(discountedSubtotal: Cents, options: { freeShippingCode?: boolean } = {}): Cents {
  if (discountedSubtotal === 0) return 0;
  if (options.freeShippingCode) return 0;
  if (discountedSubtotal > FREE_SHIPPING_THRESHOLD) return 0;
  return STANDARD_SHIPPING;
}
