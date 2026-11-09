import { cookies } from "next/headers";

const CART_COOKIE = "cartKey";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function readCartKey(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CART_COOKIE)?.value;
  if (!value || !UUID_PATTERN.test(value)) return null;
  return value;
}

export async function ensureCartKey(): Promise<string> {
  const existing = await readCartKey();
  if (existing) return existing;
  const key = crypto.randomUUID();
  const jar = await cookies();
  jar.set(CART_COOKIE, key, cookieOptions());
  return key;
}

export async function clearCartKey(): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
