import { describe, expect, it } from "vitest";
import {
  formatRating,
  ratingLabel,
  starFills,
  stockLabel,
  verifiedSavingPence,
} from "@/lib/product-card";

describe("starFills", () => {
  it("snaps to the nearest half and clamps the ends", () => {
    expect(starFills(0)).toEqual([0, 0, 0, 0, 0]);
    expect(starFills(0.2)).toEqual([0, 0, 0, 0, 0]);
    expect(starFills(0.3)).toEqual([0.5, 0, 0, 0, 0]);
    expect(starFills(0.5)).toEqual([0.5, 0, 0, 0, 0]);
    expect(starFills(4.2)).toEqual([1, 1, 1, 1, 0]);
    expect(starFills(4.3)).toEqual([1, 1, 1, 1, 0.5]);
    expect(starFills(4.8)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(5)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(9)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(-2)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("ratingLabel", () => {
  it("names the average, and zero reviews as a sentence", () => {
    expect(formatRating(4)).toBe("4.0");
    expect(ratingLabel(4.2, 128)).toBe("Rated 4.2 out of 5 from 128 reviews");
    expect(ratingLabel(5, 1)).toBe("Rated 5.0 out of 5 from 1 review");
    expect(ratingLabel(0, 0)).toBe("No reviews yet");
    expect(ratingLabel(3.5)).toBe("Rated 3.5 out of 5");
  });
});

describe("verifiedSavingPence", () => {
  it("returns integer pence only when the list price is higher", () => {
    expect(verifiedSavingPence(2400, 4000)).toBe(1600);
    expect(verifiedSavingPence(2400, null)).toBeNull();
    expect(verifiedSavingPence(2400, 2400)).toBeNull();
    expect(verifiedSavingPence(2400, 1800)).toBeNull();
    expect(verifiedSavingPence(1999, 2000)).toBe(1);
  });
});

describe("stockLabel", () => {
  it("warns from 1 to 3 and stays quiet when stock is healthy", () => {
    expect(stockLabel(0)).toBe("Out of stock");
    expect(stockLabel(1)).toBe("Only 1 left");
    expect(stockLabel(3)).toBe("Only 3 left");
    expect(stockLabel(4)).toBeNull();
  });
});
