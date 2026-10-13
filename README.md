# checkout-core

Cart, discount, shipping and tax logic for an online store checkout, written in TypeScript.

## What it does

- **Cart**: add products, change quantities, get the subtotal.
- **Discount codes**: percent off, fixed amount off and free shipping, with minimum order sizes and end dates.
- **Shipping**: standard rate, free above a set order size or with a free shipping code.
- **Tax**: sales tax by region on the discounted subtotal (sample rates only).
- **Quote**: one call that prices a whole cart and explains any code that did not apply.

All money is stored in whole cents, so `1999` means $19.99.

```ts
import { Cart, quote, formatCents } from "checkout-core";

const cart = new Cart();
cart.add({ sku: "MUG-OAK", name: "Oak handle mug", unitPrice: 1800 });
cart.add({ sku: "CANDLE-CEDAR", name: "Cedar candle", unitPrice: 950 }, 2);

const result = quote(cart, { region: "US-FL", discountCode: "WELCOME10" });
console.log(formatCents(result.total));
```

## Run it

```bash
npm install
npm test
npm run typecheck
```

Order of pricing: subtotal, then discount, then shipping, then tax on the discounted subtotal. Shipping is not taxed.
