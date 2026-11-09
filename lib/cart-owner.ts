import { and, eq, isNull, type SQL } from "drizzle-orm";
import { cartItems } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { ensureCartKey, readCartKey } from "@/lib/cart-session";

export type CartOwner =
  | { kind: "user"; userId: string }
  | { kind: "guest"; sessionKey: string };

export async function readCartOwner(): Promise<CartOwner | null> {
  const session = await getSession();
  if (session) return { kind: "user", userId: session.userId };
  const sessionKey = await readCartKey();
  if (!sessionKey) return null;
  return { kind: "guest", sessionKey };
}

export async function writeCartOwner(): Promise<CartOwner> {
  const session = await getSession();
  if (session) return { kind: "user", userId: session.userId };
  const sessionKey = await ensureCartKey();
  return { kind: "guest", sessionKey };
}

export function cartOwnerWhere(owner: CartOwner): SQL {
  const clause =
    owner.kind === "user"
      ? and(eq(cartItems.userId, owner.userId), isNull(cartItems.sessionKey))
      : and(eq(cartItems.sessionKey, owner.sessionKey), isNull(cartItems.userId));
  if (!clause) {
    throw new Error("Cart owner filter was empty.");
  }
  return clause;
}

export function ownerColumns(owner: CartOwner): {
  userId: string | null;
  sessionKey: string | null;
} {
  if (owner.kind === "user") return { userId: owner.userId, sessionKey: null };
  return { userId: null, sessionKey: owner.sessionKey };
}
