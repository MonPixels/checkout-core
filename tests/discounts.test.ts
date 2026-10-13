import { describe, expect, it } from "vitest";
import { checkDiscount, discountAmount, findDiscount } from "../src/discounts";

describe("findDiscount", () => {
  it("ignores case and spaces", () => {
    expect(findDiscount("  welcome10 ")?.code).toBe("WELCOME10");
  });

  it("returns undefined for unknown codes", () => {
    expect(findDiscount("FREEMONEY")).toBeUndefined();
  });
});

describe("checkDiscount", () => {
  const spring = findDiscount("SPRING25")!;

  it("accepts a code that meets its minimum before it expires", () => {
    expect(checkDiscount(spring, 10_000, new Date("2027-06-20T12:00:00Z"))).toEqual({ ok: true });
  });

  it("rejects a code below its minimum subtotal", () => {
    expect(checkDiscount(spring, 9_999, new Date("2027-06-20T12:00:00Z"))).toEqual({ ok: false, reason: "below_minimum" });
  });

  it("rejects a code from the moment it expires", () => {
    expect(checkDiscount(spring, 20_000, new Date("2027-06-21T00:00:00Z"))).toEqual({ ok: false, reason: "expired" });
  });
});

describe("discountAmount", () => {
  it("rounds percent discounts to the nearest cent", () => {
    expect(discountAmount(findDiscount("WELCOME10")!, 1_999)).toBe(200);
  });

  it("never takes off more than the subtotal", () => {
    expect(discountAmount(findDiscount("SAVE5")!, 300)).toBe(300);
  });

  it("takes nothing off the subtotal for free shipping codes", () => {
    expect(discountAmount(findDiscount("SHIPFREE")!, 4_000)).toBe(0);
  });
});
