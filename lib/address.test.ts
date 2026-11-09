import { describe, expect, it } from "vitest";
import { normalizeUkPhone, normalizeUkPostcode, parseAddress } from "@/lib/address";

describe("UK address checks", () => {
  it("normalises postcodes", () => {
    expect(normalizeUkPostcode("sw1a1aa")).toBe("SW1A 1AA");
    expect(normalizeUkPostcode("M1 1AE")).toBe("M1 1AE");
    expect(normalizeUkPostcode("EC1A 1BB")).toBe("EC1A 1BB");
    expect(normalizeUkPostcode("W1A 0AX")).toBe("W1A 0AX");
  });

  it("rejects postcodes that are not UK", () => {
    expect(normalizeUkPostcode("12345")).toBeNull();
    expect(normalizeUkPostcode("SW1A")).toBeNull();
    expect(normalizeUkPostcode("ABCDEF")).toBeNull();
    expect(normalizeUkPostcode("SW1A 1A")).toBeNull();
  });

  it("accepts a UK phone with spaces", () => {
    expect(normalizeUkPhone("020 7946 0958")).toBe("02079460958");
    expect(normalizeUkPhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizeUkPhone("123")).toBeNull();
  });

  it("returns the first broken field", () => {
    const parsed = parseAddress({
      fullName: "Ada Lovelace",
      line1: "1 Example Street",
      city: "London",
      postcode: "nope",
      phone: "02079460958",
    });
    expect(parsed).toEqual({
      ok: false,
      field: "postcode",
      error: "Enter a UK postcode, such as SW1A 1AA.",
    });
  });
});
