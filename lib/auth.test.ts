import { describe, expect, it } from "vitest";
import { readSessionToken, signSessionToken } from "@/lib/auth";

const secret = "test-secret-with-enough-bytes-for-hs256";
const payload = { userId: "user-1", sessionId: "session-1", name: "Ada" };

describe("session tokens", () => {
  it("signs and reads a token", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const expiresAt = new Date("2026-07-01T00:00:00.000Z");
    const token = await signSessionToken(payload, secret, expiresAt);
    await expect(readSessionToken(token, secret, now)).resolves.toEqual(payload);
  });

  it("returns null for an expired token", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const expiresAt = new Date(now.getTime() - 1000);
    const token = await signSessionToken(payload, secret, expiresAt);
    await expect(readSessionToken(token, secret, now)).resolves.toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const expiresAt = new Date("2026-07-01T00:00:00.000Z");
    const token = await signSessionToken(payload, secret, expiresAt);
    const parts = token.split(".");
    const signature = parts[2];
    if (!signature) throw new Error("Expected a signed token");
    const flipped = signature.endsWith("a")
      ? `${signature.slice(0, -1)}b`
      : `${signature.slice(0, -1)}a`;
    const tampered = `${parts[0]}.${parts[1]}.${flipped}`;
    const now = new Date("2026-06-01T00:00:00.000Z");
    await expect(readSessionToken(tampered, secret, now)).resolves.toBeNull();
  });

  it("returns null for the wrong secret", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const expiresAt = new Date("2026-07-01T00:00:00.000Z");
    const token = await signSessionToken(payload, secret, expiresAt);
    await expect(readSessionToken(token, "a-different-secret-value-here", now)).resolves.toBeNull();
  });
});
