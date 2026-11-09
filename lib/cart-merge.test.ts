import { describe, expect, it } from "vitest";
import { mergeQuantities } from "@/lib/cart-merge";

describe("mergeQuantities", () => {
  it("sums both quantities when the same product is already in the signed-in cart and the guest cart", () => {
    expect(mergeQuantities(2, 3, 10)).toBe(5);
  });

  it("caps the collided quantity at stock when the signed-in and guest quantities sum past it", () => {
    expect(mergeQuantities(4, 3, 5)).toBe(5);
  });

  it("yields zero when the collided product is out of stock", () => {
    expect(mergeQuantities(2, 3, 0)).toBe(0);
  });

  it("treats an empty incoming quantity as zero when the carts collide", () => {
    expect(mergeQuantities(2, 0, 10)).toBe(2);
  });

  it("treats negative quantities as zero before summing a cart collision", () => {
    expect(mergeQuantities(-2, 4, 10)).toBe(4);
    expect(mergeQuantities(3, -1, 10)).toBe(3);
    expect(mergeQuantities(2, 2, -5)).toBe(0);
  });
});
