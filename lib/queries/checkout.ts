import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { cartItems, products } from "@/drizzle/schema";
import { readBuyNow } from "@/lib/buy-now";
import type { CheckoutLine, CheckoutMode } from "@/lib/checkout";
import { db } from "@/lib/db";

const productColumns = {
  productId: products.id,
  slug: products.slug,
  title: products.title,
  image: sql<string | null>`${products.imageUrls}->>0`,
  unitPriceInPence: products.priceInPence,
  stock: products.stock,
};

function asInt(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.trunc(number);
}

function toLine(
  row: {
    productId: string;
    slug: string;
    title: string;
    image: string | null;
    unitPriceInPence: number;
    stock: number;
  },
  quantity: number,
): CheckoutLine {
  return {
    productId: row.productId,
    slug: row.slug,
    title: row.title,
    image: row.image ? row.image : null,
    unitPriceInPence: asInt(row.unitPriceInPence),
    quantity,
    stock: asInt(row.stock),
  };
}

export async function getCartCheckoutLines(userId: string): Promise<CheckoutLine[]> {
  const rows = await db
    .select({
      ...productColumns,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(
      and(
        eq(cartItems.userId, userId),
        eq(cartItems.savedForLater, false),
        isNull(cartItems.sessionKey),
      ),
    )
    .orderBy(asc(products.title), asc(cartItems.id));

  return rows.map((row) => toLine(row, asInt(row.quantity)));
}

export async function getBuyNowCheckoutLine(sessionId: string): Promise<CheckoutLine | null> {
  const intent = await readBuyNow(sessionId);
  if (!intent) return null;

  const [row] = await db
    .select(productColumns)
    .from(products)
    .where(eq(products.id, intent.productId))
    .limit(1);

  if (!row) return null;
  return toLine(row, intent.quantity);
}

export async function getCheckoutLines(
  mode: CheckoutMode,
  userId: string,
  sessionId: string,
): Promise<CheckoutLine[]> {
  if (mode === "buy") {
    const line = await getBuyNowCheckoutLine(sessionId);
    return line ? [line] : [];
  }
  return getCartCheckoutLines(userId);
}
