"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { viewHistory } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

const productIdSchema = z.uuid();

const guestKeyPattern = /^[\w-]{8,200}$/;

function errorBlob(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && typeof current.code === "string") parts.push(current.code);
    if ("message" in current && typeof current.message === "string") parts.push(current.message);
    current = "cause" in current ? current.cause : undefined;
  }
  return parts.join(" ");
}

function ignoredWrite(error: unknown): boolean {
  const blob = errorBlob(error);
  if (blob.includes("23505")) return true;
  return blob.includes("23503") && blob.includes("view_history_product_id");
}

async function guestSessionKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(config.guestCookie)?.value;
  if (existing && guestKeyPattern.test(existing)) return existing;

  const sessionKey = crypto.randomUUID();
  jar.set(config.guestCookie, sessionKey, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 400,
  });
  return sessionKey;
}

export async function recordView(productId: string): Promise<void> {
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return;

  const session = await getSession();
  const userId = session?.userId ?? null;
  const sessionKey = session ? null : await guestSessionKey();

  try {
    await db.insert(viewHistory).values({
      productId: parsed.data,
      userId,
      sessionKey,
    });
  } catch (error) {
    if (ignoredWrite(error)) return;
    throw error;
  }
}
