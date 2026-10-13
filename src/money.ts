/** All money in checkout-core is stored as whole cents to avoid floating point errors. */
export type Cents = number;

export function assertCents(value: number, label = "amount"): asserts value is Cents {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative whole number of cents, got ${value}`);
  }
}

/** Formats cents as a price string, for example 1999 -> "$19.99". */
export function formatCents(cents: Cents, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

/** Percentage of an amount, rounded to the nearest cent. */
export function percentOf(cents: Cents, percent: number): Cents {
  return Math.floor((cents * percent) / 100);
}
