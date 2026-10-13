import { describe, expect, it } from "vitest";
import { Cart } from "../src/cart";

const mug = { sku: "MUG-OAK", name: "Oak handle mug", unitPrice: 1800 };
const candle = { sku: "CANDLE-CEDAR", name: "Cedar candle", unitPrice: 950 };

describe("Cart", () => {
  it("adds products and merges repeat adds into one line", () => {
    const cart = new Cart();
    cart.add(mug);
    cart.add(mug, 2);
    cart.add(candle);

    expect(cart.items()).toHaveLength(2);
    expect(cart.itemCount()).toBe(4);
    expect(cart.subtotal()).toBe(3 * 1800 + 950);
  });

  it("removes a line when its quantity is set to 0", () => {
    const cart = new Cart();
    cart.add(mug, 2);
    cart.setQuantity("MUG-OAK", 0);

    expect(cart.isEmpty()).toBe(true);
    expect(cart.subtotal()).toBe(0);
  });

  it("rejects quantities outside 1 to 99", () => {
    const cart = new Cart();
    expect(() => cart.add(mug, 0)).toThrow(RangeError);
    expect(() => cart.add(mug, 100)).toThrow(RangeError);
    cart.add(mug, 98);
    expect(() => cart.add(mug, 2)).toThrow(RangeError);
  });

  it("rejects prices that are not whole cents", () => {
    const cart = new Cart();
    expect(() => cart.add({ ...mug, unitPrice: 18.5 })).toThrow(RangeError);
    expect(() => cart.add({ ...mug, unitPrice: -100 })).toThrow(RangeError);
  });

  it("throws when changing a line that is not in the cart", () => {
    const cart = new Cart();
    expect(() => cart.setQuantity("NOPE", 1)).toThrow("No line with sku NOPE");
  });
});
