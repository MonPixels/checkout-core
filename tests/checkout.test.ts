import { describe, expect, it } from "vitest";
import { Cart } from "../src/cart";
import { quote } from "../src/checkout";
import { formatCents } from "../src/money";

const mug = { sku: "MUG-OAK", name: "Oak handle mug", unitPrice: 1800 };
const candle = { sku: "CANDLE-CEDAR", name: "Cedar candle", unitPrice: 950 };
const board = { sku: "BOARD-WALNUT", name: "Walnut serving board", unitPrice: 4200 };

function cartWith(...lines: [typeof mug, number][]): Cart {
  const cart = new Cart();
  for (const [product, quantity] of lines) cart.add(product, quantity);
  return cart;
}

describe("quote", () => {
  it("adds standard shipping and tax to a small order", () => {
    const result = quote(cartWith([mug, 1], [candle, 2]), { region: "US-FL" });

    expect(result).toEqual({ subtotal: 3700, discount: 0, shipping: 599, tax: 222, total: 4521, appliedCode: undefined, notices: [] });
  });

  it("ships free above the threshold", () => {
    const result = quote(cartWith([board, 1], [mug, 1]), { region: "US-NY" });

    expect(result.shipping).toBe(0);
    expect(result.tax).toBe(240);
    expect(result.total).toBe(6240);
  });

  it("charges shipping at exactly the threshold", () => {
    const result = quote(cartWith([mug, 1], [candle, 2], [{ sku: "PEN", name: "Pen", unitPrice: 550 }, 1]), { region: "US-NY" });

    expect(result.subtotal).toBe(5_000);
    expect(result.shipping).toBe(599);
  });

  it("applies a percent code before shipping and tax", () => {
    const result = quote(cartWith([board, 1], [mug, 1]), { region: "US-FL", discountCode: "welcome10" });

    expect(result.appliedCode).toBe("WELCOME10");
    expect(result.discount).toBe(600);
    expect(result.shipping).toBe(0);
    expect(result.tax).toBe(324);
    expect(result.total).toBe(5724);
  });

  it("charges shipping again when a discount drops the order below the threshold", () => {
    const result = quote(cartWith([board, 1], [candle, 1]), { region: "US-FL", discountCode: "WELCOME10" });

    expect(result.subtotal).toBe(5150);
    expect(result.discount).toBe(515);
    expect(result.shipping).toBe(599);
    expect(result.tax).toBe(278);
    expect(result.total).toBe(5512);
  });

  it("removes shipping with a free shipping code", () => {
    const result = quote(cartWith([mug, 1], [candle, 2]), { region: "US-TX", discountCode: "SHIPFREE" });

    expect(result.appliedCode).toBe("SHIPFREE");
    expect(result.shipping).toBe(0);
    expect(result.tax).toBe(231);
    expect(result.total).toBe(3931);
  });

  it("explains why a code did not apply", () => {
    const tooSmall = quote(cartWith([mug, 1]), { region: "US-OR", discountCode: "SAVE5" });
    expect(tooSmall.discount).toBe(0);
    expect(tooSmall.total).toBe(2399);
    expect(tooSmall.notices).toEqual(["The code SAVE5 needs a bigger order."]);

    const unknown = quote(cartWith([mug, 1]), { region: "US-OR", discountCode: " nope " });
    expect(unknown.notices).toEqual(["The code NOPE does not exist."]);

    const expired = quote(cartWith([board, 3]), { region: "US-OR", discountCode: "SPRING25", now: new Date("2027-07-01T00:00:00Z") });
    expect(expired.notices).toEqual(["The code SPRING25 has expired."]);
  });

  it("prices an empty cart at zero", () => {
    expect(quote(new Cart(), { region: "US-FL" })).toMatchObject({ subtotal: 0, shipping: 0, tax: 0, total: 0 });
  });

  it("refuses regions with no tax rate", () => {
    expect(() => quote(cartWith([mug, 1]), { region: "MARS" })).toThrow("No tax rate configured for region MARS");
  });

  it("formats totals for display", () => {
    expect(formatCents(4521)).toBe("$45.21");
  });
});
