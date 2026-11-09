"use server";

import { eq } from "drizzle-orm";
import { users } from "@/drizzle/schema";
import {
  authFailure,
  fieldErrorsFrom,
  signInSchema,
  signUpSchema,
  type AuthResult,
  type FieldErrors,
} from "@/lib/auth-schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { mergeGuestCart } from "@/lib/cart-merge";

export type { AuthResult, FieldErrors };

async function database() {
  const { db } = await import("@/lib/db");
  return db;
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  if ("cause" in error) return isUniqueViolation(error.cause);
  return false;
}

export async function signUp(input: unknown): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return authFailure(fieldErrorsFrom(parsed.error));

  const { name, email, password } = parsed.data;
  const db = await database();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return authFailure({ email: "An account with that email already exists." });
  }

  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    const [created] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning({ id: users.id });
    if (!created) throw new Error("Account was not created");
    userId = created.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return authFailure({ email: "An account with that email already exists." });
    }
    throw error;
  }

  await mergeGuestCart(userId);
  await createSession({ id: userId, name });
  return { ok: true, data: { name } };
}

export async function signIn(input: unknown): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return authFailure(fieldErrorsFrom(parsed.error));

  const { email, password } = parsed.data;
  const db = await database();
  const [user] = await db
    .select({ id: users.id, name: users.name, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return authFailure({ email: "No account with that email." });

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) return authFailure({ password: "That password is incorrect." });

  await mergeGuestCart(user.id);
  await createSession({ id: user.id, name: user.name });
  return { ok: true, data: { name: user.name } };
}

export async function signOut(): Promise<{ ok: true; data: null }> {
  await destroySession();
  return { ok: true, data: null };
}
