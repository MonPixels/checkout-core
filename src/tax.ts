import { percentOf, type Cents } from "./money";

/** Sample sales tax rates in percent, by region code. Demo data, not tax advice. */
export const TAX_RATES: Readonly<Record<string, number>> = {
  "US-FL": 6,
  "US-NY": 4,
  "US-TX": 6.25,
  "US-OR": 0,
};

export function taxRate(region: string): number {
  const rate = TAX_RATES[region];
  if (rate === undefined) throw new Error(`No tax rate configured for region ${region}`);
  return rate;
}

/** Tax on the discounted subtotal. Shipping is not taxed in this store. */
export function taxFor(taxableAmount: Cents, region: string): Cents {
  return percentOf(taxableAmount, taxRate(region));
}
