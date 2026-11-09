import { and, asc, eq, sql } from "drizzle-orm";
import { cartItems, products, wishlistItems } from "@/drizzle/schema";
import { cartOwnerWhere, readCartOwner, type CartOwner } from "@/lib/cart-owner";
import { db } from "@/lib/db";
import { quoteCart, type PriceQuote } from "@/lib/pricing";

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  unitPriceInPence: number;
  listPriceInPence: number | null;
  quantity: number;
  stock: number;
  savedForLater: boolean;
};

export type CartView = {
  lines: CartLine[];
  quote: PriceQuote;
  count: number;
};

const lineColumns = {
  id: cartItems.id,
  productId: products.id,
  slug: products.slug,
  title: products.title,
  image: sql<string | null>`${products.imageUrls}->>0`,
  unitPriceInPence: products.priceInPence,
  listPriceInPence: products.listPriceInPence,
  quantity: cartItems.quantity,
  stock: products.stock,
  savedForLater: cartItems.savedForLater,
};

function asInt(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.trunc(number);
}

function toLine(row: {
  id: string;
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  unitPriceInPence: number;
  listPriceInPence: number | null;
  quantity: number;
  stock: number;
  savedForLater: boolean;
}): CartLine {
  return {
    id: row.id,
    productId: row.productId,
    slug: row.slug,
    title: row.title,
    image: row.image ? row.image : null,
    unitPriceInPence: asInt(row.unitPriceInPence),
    listPriceInPence: row.listPriceInPence == null ? null : asInt(row.listPriceInPence),
    quantity: asInt(row.quantity),
    stock: asInt(row.stock),
    savedForLater: row.savedForLater,
  };
}

function emptyView(shippingOptionId: string): CartView {
  return {
    lines: [],
    quote: quoteCart([], shippingOptionId),
    count: 0,
  };
}

async function selectLines(owner: CartOwner, savedForLater: boolean): Promise<CartLine[]> {
  const rows = await db
    .select(lineColumns)
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(and(cartOwnerWhere(owner), eq(cartItems.savedForLater, savedForLater)))
    .orderBy(asc(products.title), asc(cartItems.id));
  return rows.map(toLine);
}

export async function getOwnedCart(
  owner: CartOwner | null,
  shippingOptionId = "standard",
): Promise<CartView> {
  if (!owner) return emptyView(shippingOptionId);
  const lines = await selectLines(owner, false);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return {
    lines,
    quote: quoteCart(
      lines.map((line) => ({
        unitPriceInPence: line.unitPriceInPence,
        quantity: line.quantity,
      })),
      shippingOptionId,
    ),
    count,
  };
}

export async function getCart(shippingOptionId?: string): Promise<CartView> {
  const owner = await readCartOwner();
  return getOwnedCart(owner, shippingOptionId ?? "standard");
}

export async function getSavedForLater(): Promise<CartLine[]> {
  const owner = await readCartOwner();
  if (!owner) return [];
  return selectLines(owner, true);
}

export async function getWishlist(userId: string): Promise<CartLine[]> {
  const rows = await db
    .select({
      id: wishlistItems.id,
      productId: products.id,
      slug: products.slug,
      title: products.title,
      image: sql<string | null>`${products.imageUrls}->>0`,
      unitPriceInPence: products.priceInPence,
      listPriceInPence: products.listPriceInPence,
      stock: products.stock,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(products.id, wishlistItems.productId))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(asc(products.title), asc(wishlistItems.id));

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    slug: row.slug,
    title: row.title,
    image: row.image ? row.image : null,
    unitPriceInPence: asInt(row.unitPriceInPence),
    listPriceInPence: row.listPriceInPence == null ? null : asInt(row.listPriceInPence),
    quantity: 1,
    stock: asInt(row.stock),
    savedForLater: false,
  }));
}

export async function getCartCount(): Promise<number> {
  const owner = await readCartOwner();
  if (!owner) return 0;
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int`,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(and(cartOwnerWhere(owner), eq(cartItems.savedForLater, false)));
  return asInt(row?.total ?? 0);
}
