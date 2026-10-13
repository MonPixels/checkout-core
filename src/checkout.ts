import type { Cart } from "./cart";
import { checkDiscount, discountAmount, findDiscount, type Discount } from "./discounts";
import type { Cents } from "./money";
import { shippingFee } from "./shipping";
import { taxFor } from "./tax";

export interface QuoteOptions {
  region: string;
  discountCode?: string;
  now?: Date;
}

export interface Quote {
  subtotal: Cents;
  discount: Cents;
  shipping: Cents;
  tax: Cents;
  total: Cents;
  appliedCode?: string;
  /** Plain messages to show the shopper, for example why a code did not apply. */
  notices: string[];
}

/** Prices a cart: subtotal, then discount, then shipping, then tax on the discounted subtotal. */
export function quote(cart: Cart, options: QuoteOptions): Quote {
  const notices: string[] = [];
  const subtotal = cart.subtotal();

  let applied: Discount | undefined;
  if (options.discountCode) {
    const found = findDiscount(options.discountCode);
    if (!found) {
      notices.push(`The code ${options.discountCode.trim().toUpperCase()} does not exist.`);
    } else {
      const check = checkDiscount(found, subtotal, options.now);
      if (check.ok) {
        applied = found;
      } else if (check.reason === "expired") {
        notices.push(`The code ${found.code} has expired.`);
      } else {
        notices.push(`The code ${found.code} needs a bigger order.`);
      }
    }
  }

  const discount = applied ? discountAmount(applied, subtotal) : 0;
  const discountedSubtotal = subtotal - discount;
  const shipping = shippingFee(discountedSubtotal, { freeShippingCode: applied?.kind === "free_shipping" });
  const tax = taxFor(discountedSubtotal, options.region);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: discountedSubtotal + shipping + tax,
    appliedCode: applied?.code,
    notices,
  };
}
