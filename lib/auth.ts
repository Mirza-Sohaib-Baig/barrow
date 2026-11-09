import { compare, hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { errors, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { sessions } from "@/drizzle/schema";

export const sessionCookieName = "barrow_session";

const bcryptCost = 10;
const sessionMaxAgeSeconds = 30 * 24 * 60 * 60;

export type SessionUser = { userId: string; sessionId: string; name: string };

type SessionClaims = { userId: string; sessionId: string; name: string };

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function claimsFrom(payload: JWTPayload): SessionClaims | null {
  const sid = payload.sid;
  const name = payload.name;
  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  if (typeof sid !== "string" || sid.length === 0) return null;
  if (typeof name !== "string") return null;
  return { userId: payload.sub, sessionId: sid, name };
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, bcryptCost);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function signSessionToken(
  payload: { userId: string; sessionId: string; name: string },
  secret: string,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ sid: payload.sessionId, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setExpirationTime(expiresAt)
    .sign(secretKey(secret));
}

export async function readSessionToken(
  token: string,
  secret: string,
  now?: Date,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    return claimsFrom(payload);
  } catch {
    return null;
  }
}

async function readSessionIdentity(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), { algorithms: ["HS256"] });
    return claimsFrom(payload);
  } catch (error) {
    if (error instanceof errors.JWTExpired) return claimsFrom(error.payload);
    return null;
  }
}

function cookieOptions(maxAge: number, expires?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    expires,
  };
}

async function cookieJar() {
  const { cookies } = await import("next/headers");
  return cookies();
}

async function database() {
  const { db } = await import("@/lib/db");
  return db;
}

async function clearSessionCookie(): Promise<void> {
  const jar = await cookieJar();
  try {
    jar.set(sessionCookieName, "", cookieOptions(0, new Date(0)));
  } catch (error) {
    const blocked =
      error instanceof Error &&
      error.message.includes("Cookies can only be modified in a Server Action or Route Handler");
    if (!blocked) throw error;
  }
}

export async function createSession(user: { id: string; name: string }): Promise<void> {
  const secret = requireAuthSecret();
  const db = await database();
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  const [row] = await db
    .insert(sessions)
    .values({ userId: user.id, expiresAt })
    .returning({ id: sessions.id });
  if (!row) throw new Error("Session was not created");

  const token = await signSessionToken(
    { userId: user.id, sessionId: row.id, name: user.name },
    secret,
    expiresAt,
  );
  const jar = await cookieJar();
  jar.set(sessionCookieName, token, cookieOptions(sessionMaxAgeSeconds, expiresAt));
}

export async function getSession(): Promise<SessionUser | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const jar = await cookieJar();
  const token = jar.get(sessionCookieName)?.value;
  if (!token) return null;

  const payload = await readSessionToken(token, secret);
  if (!payload) {
    await clearSessionCookie();
    return null;
  }

  const db = await database();
  const [row] = await db
    .select({ expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(and(eq(sessions.id, payload.sessionId), eq(sessions.userId, payload.userId)))
    .limit(1);

  if (!row || row.expiresAt.getTime() <= Date.now()) {
    await clearSessionCookie();
    return null;
  }

  return { userId: payload.userId, sessionId: payload.sessionId, name: payload.name };
}

export async function destroySession(): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    const jar = await cookieJar();
    const token = jar.get(sessionCookieName)?.value;
    if (token) {
      const payload = await readSessionIdentity(token, secret);
      if (payload) {
        const db = await database();
        await db
          .delete(sessions)
          .where(and(eq(sessions.id, payload.sessionId), eq(sessions.userId, payload.userId)));
      }
    }
  }
  await clearSessionCookie();
}
