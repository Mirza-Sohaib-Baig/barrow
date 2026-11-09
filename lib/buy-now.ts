import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { authSecret } from "@/lib/auth";

export const buyNowCookieName = "barrow_buy_now";
const buyNowMaxAgeSeconds = 30 * 60;

export type BuyNowIntent = {
  sessionId: string;
  productId: string;
  quantity: number;
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function quantityFrom(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) return null;
  return parsed;
}

function intentFrom(payload: JWTPayload): BuyNowIntent | null {
  const quantity = quantityFrom(payload.qty);
  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  if (typeof payload.pid !== "string" || payload.pid.length === 0) return null;
  if (quantity == null) return null;
  return { sessionId: payload.sub, productId: payload.pid, quantity };
}

export async function signBuyNowIntent(
  intent: BuyNowIntent,
  secret: string,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ pid: intent.productId, qty: intent.quantity })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(intent.sessionId)
    .setExpirationTime(expiresAt)
    .sign(secretKey(secret));
}

export async function readBuyNowIntent(
  token: string,
  secret: string,
  now?: Date,
): Promise<BuyNowIntent | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    return intentFrom(payload);
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

async function cookieJar() {
  const { cookies } = await import("next/headers");
  return cookies();
}

export async function writeBuyNow(intent: BuyNowIntent): Promise<void> {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const expiresAt = new Date(Date.now() + buyNowMaxAgeSeconds * 1000);
  const token = await signBuyNowIntent(intent, secret, expiresAt);
  const jar = await cookieJar();
  jar.set(buyNowCookieName, token, cookieOptions(buyNowMaxAgeSeconds));
}

export async function readBuyNow(sessionId: string): Promise<BuyNowIntent | null> {
  const secret = authSecret();
  if (!secret) return null;
  const jar = await cookieJar();
  const token = jar.get(buyNowCookieName)?.value;
  if (!token) return null;
  const intent = await readBuyNowIntent(token, secret);
  if (!intent || intent.sessionId !== sessionId) return null;
  return intent;
}

export async function clearBuyNow(): Promise<void> {
  const jar = await cookieJar();
  jar.set(buyNowCookieName, "", cookieOptions(0));
}
