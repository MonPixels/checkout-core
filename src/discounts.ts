import { percentOf, type Cents } from "./money";

interface DiscountBase {
  code: string;
  /** The cart subtotal (in cents) must be at least this much for the code to apply. */
  minSubtotal?: Cents;
  /** The code stops working at this moment. */
  expiresAt?: Date;
}

export type Discount =
  | (DiscountBase & { kind: "percent"; percent: number })
  | (DiscountBase & { kind: "fixed"; amount: Cents })
  | (DiscountBase & { kind: "free_shipping" });

/** Codes currently live in the store. */
export const DISCOUNT_CODES: readonly Discount[] = [
  { code: "WELCOME10", kind: "percent", percent: 10 },
  { code: "SPRING25", kind: "percent", percent: 25, minSubtotal: 10_000, expiresAt: new Date("2027-06-21T00:00:00Z") },
  { code: "SAVE5", kind: "fixed", amount: 500, minSubtotal: 2_500 },
  { code: "SHIPFREE", kind: "free_shipping", minSubtotal: 3_000 },
];

export function findDiscount(code: string, codes: readonly Discount[] = DISCOUNT_CODES): Discount | undefined {
  const normalized = code.trim().toUpperCase();
  return codes.find((discount) => discount.code === normalized);
}

export type DiscountCheck = { ok: true } | { ok: false; reason: "expired" | "below_minimum" };

export function checkDiscount(discount: Discount, subtotal: Cents, now: Date = new Date()): DiscountCheck {
  if (discount.expiresAt && now >= discount.expiresAt) {
    return { ok: false, reason: "expired" };
  }
  if (discount.minSubtotal !== undefined && subtotal < discount.minSubtotal) {
    return { ok: false, reason: "below_minimum" };
  }
  return { ok: true };
}

/** How much a discount takes off the subtotal, in cents. Never more than the subtotal itself. */
export function discountAmount(discount: Discount, subtotal: Cents): Cents {
  switch (discount.kind) {
    case "percent":
      return Math.min(percentOf(subtotal, discount.percent), subtotal);
    case "fixed":
      return Math.min(discount.amount, subtotal);
    case "free_shipping":
      return 0;
  }
}
