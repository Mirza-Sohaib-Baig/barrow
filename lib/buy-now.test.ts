import { describe, expect, it } from "vitest";
import { readBuyNowIntent, signBuyNowIntent, type BuyNowIntent } from "@/lib/buy-now";

const secret = "test-secret-with-enough-bytes-for-hs256";
const intent: BuyNowIntent = {
  sessionId: "session-1",
  productId: "product-1",
  quantity: 2,
};

describe("buy now intent", () => {
  it("round-trips a session-scoped item", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    const token = await signBuyNowIntent(intent, secret, expiresAt);
    await expect(readBuyNowIntent(token, secret, now)).resolves.toEqual(intent);
  });

  it("expires", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const token = await signBuyNowIntent(intent, secret, new Date(now.getTime() - 1000));
    await expect(readBuyNowIntent(token, secret, now)).resolves.toBeNull();
  });

  it("rejects a tampered token", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const token = await signBuyNowIntent(intent, secret, new Date(now.getTime() + 60_000));
    const [header, body, signature] = token.split(".");
    if (!signature || signature.length < 4) throw new Error("Expected a signed token");
    const index = Math.floor(signature.length / 2);
    const replacement = signature[index] === "a" ? "b" : "a";
    const flipped = `${signature.slice(0, index)}${replacement}${signature.slice(index + 1)}`;
    await expect(readBuyNowIntent(`${header}.${body}.${flipped}`, secret, now)).resolves.toBeNull();
  });
});
