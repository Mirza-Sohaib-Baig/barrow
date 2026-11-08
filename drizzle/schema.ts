import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export type AddressSnapshot = {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
  phone: string;
};

function timestampColumn(name: string) {
  return timestamp(name, { withTimezone: true, mode: "date" });
}

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestampColumn("expires_at").notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    postcode: text("postcode").notNull(),
    country: text("country").notNull(),
    phone: text("phone").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [index("addresses_user_id_idx").on(table.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    parentId: uuid("parent_id"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "categories_parent_id_fk",
    }).onDelete("set null"),
    index("categories_parent_id_idx").on(table.parentId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    bullets: jsonb("bullets").$type<string[]>().notNull(),
    specs: jsonb("specs").$type<Record<string, string>>().notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brand: text("brand").notNull(),
    priceInPence: integer("price_in_pence").notNull(),
    listPriceInPence: integer("list_price_in_pence"),
    ratingAverage: real("rating_average").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    imageUrls: jsonb("image_urls").$type<string[]>().notNull(),
    searchVector: tsvector("search_vector"),
    createdAt: timestampColumn("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_rating_average_idx").on(table.ratingAverage),
    index("products_price_in_pence_idx").on(table.priceInPence),
    index("products_search_vector_idx").using("gin", table.searchVector),
    index("products_title_trgm_idx").using("gin", table.title.op("gin_trgm_ops")),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isVerified: boolean("is_verified").notNull().default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: timestampColumn("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("reviews_product_id_idx").on(table.productId),
    index("reviews_user_id_idx").on(table.userId),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionKey: text("session_key"),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    savedForLater: boolean("saved_for_later").notNull().default(false),
  },
  (table) => [
    index("cart_items_user_id_idx").on(table.userId),
    index("cart_items_session_key_idx").on(table.sessionKey),
    index("cart_items_product_id_idx").on(table.productId),
  ],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestampColumn("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wishlist_items_user_product_idx").on(table.userId, table.productId),
    index("wishlist_items_product_id_idx").on(table.productId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    subtotalInPence: integer("subtotal_in_pence").notNull(),
    shippingInPence: integer("shipping_in_pence").notNull(),
    taxInPence: integer("tax_in_pence").notNull(),
    totalInPence: integer("total_in_pence").notNull(),
    shippingOption: text("shipping_option").notNull(),
    shippingAddress: jsonb("shipping_address").$type<AddressSnapshot>().notNull(),
    paymentIntentId: text("payment_intent_id").notNull(),
    paymentLast4: text("payment_last4").notNull(),
    placedAt: timestampColumn("placed_at").notNull(),
    cancelledAt: timestampColumn("cancelled_at"),
    returnRequestedAt: timestampColumn("return_requested_at"),
    returnReason: text("return_reason"),
  },
  (table) => [index("orders_user_id_idx").on(table.userId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productTitle: text("product_title").notNull(),
    imageUrl: text("image_url").notNull(),
    unitPriceInPence: integer("unit_price_in_pence").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
  ],
);

export const contactRequests = pgTable(
  "contact_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: timestampColumn("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("contact_requests_user_id_idx").on(table.userId),
    index("contact_requests_order_id_idx").on(table.orderId),
  ],
);

export const viewHistory = pgTable(
  "view_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionKey: text("session_key"),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    viewedAt: timestampColumn("viewed_at").notNull().defaultNow(),
  },
  (table) => [
    index("view_history_user_id_idx").on(table.userId),
    index("view_history_session_key_idx").on(table.sessionKey),
    index("view_history_product_id_idx").on(table.productId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  addresses: many(addresses),
  reviews: many(reviews),
  cartItems: many(cartItems),
  wishlistItems: many(wishlistItems),
  orders: many(orders),
  contactRequests: many(contactRequests),
  viewHistory: many(viewHistory),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
  cartItems: many(cartItems),
  wishlistItems: many(wishlistItems),
  orderItems: many(orderItems),
  viewHistory: many(viewHistory),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  contactRequests: many(contactRequests),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const contactRequestsRelations = relations(contactRequests, ({ one }) => ({
  user: one(users, { fields: [contactRequests.userId], references: [users.id] }),
  order: one(orders, { fields: [contactRequests.orderId], references: [orders.id] }),
}));

export const viewHistoryRelations = relations(viewHistory, ({ one }) => ({
  user: one(users, { fields: [viewHistory.userId], references: [users.id] }),
  product: one(products, {
    fields: [viewHistory.productId],
    references: [products.id],
  }),
}));
