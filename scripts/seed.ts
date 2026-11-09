import { eq } from "drizzle-orm";
import { addresses, orderItems, orders, products, users } from "@/drizzle/schema";
import { hashPassword } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

const demoEmail = "demo@barrow.shop";
const demoPassword = "barrow-demo";
const demoName = "Demo Shopper";

const demoAddress = {
  fullName: demoName,
  line1: "1 Example Street",
  line2: null,
  city: "London",
  postcode: "SW1A 1AA",
  country: "GB",
  phone: "02079460958",
};

const hourMs = 60 * 60 * 1000;

const demoOrders = [
  { orderNumber: "B-DEMO-1", paymentIntentId: "pi_demo_1", hoursAgo: 1 },
  { orderNumber: "B-DEMO-2", paymentIntentId: "pi_demo_2", hoursAgo: 30 },
  { orderNumber: "B-DEMO-3", paymentIntentId: "pi_demo_3", hoursAgo: 96 },
] as const;

function taxInPence(subtotalInPence: number): number {
  return Math.round((subtotalInPence * Math.round(config.taxRate * 100)) / 100);
}

async function main(): Promise<void> {
  const passwordHash = await hashPassword(demoPassword);
  const [user] = await db
    .insert(users)
    .values({ email: demoEmail, name: demoName, passwordHash })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: demoName, passwordHash },
    })
    .returning({ id: users.id });

  if (!user) throw new Error("Demo user was not saved");

  const ownedAddresses = await db
    .select({ id: addresses.id, isDefault: addresses.isDefault })
    .from(addresses)
    .where(eq(addresses.userId, user.id));
  const currentAddress = ownedAddresses.find((row) => row.isDefault) ?? ownedAddresses[0];

  if (currentAddress) {
    await db
      .update(addresses)
      .set({ ...demoAddress, isDefault: true })
      .where(eq(addresses.id, currentAddress.id));
  } else {
    await db.insert(addresses).values({ userId: user.id, ...demoAddress, isDefault: true });
  }

  const [existingOrder] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.userId, user.id))
    .limit(1);
  if (existingOrder) return;

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      priceInPence: products.priceInPence,
      imageUrls: products.imageUrls,
    })
    .from(products)
    .limit(1);

  if (!product) {
    console.log("The products table is empty, so the demo orders were skipped.");
    return;
  }

  const shipping = config.shippingOptions.find((option) => option.id === "standard");
  if (!shipping) throw new Error("Standard shipping is not configured");

  const quantity = 1;
  const subtotalInPence = product.priceInPence * quantity;
  const shippingInPence = shipping.pricePence;
  const tax = taxInPence(subtotalInPence);
  const totalInPence = subtotalInPence + shippingInPence + tax;
  const imageUrl = product.imageUrls[0] ?? "";
  const now = Date.now();

  for (const demoOrder of demoOrders) {
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: demoOrder.orderNumber,
        userId: user.id,
        subtotalInPence,
        shippingInPence,
        taxInPence: tax,
        totalInPence,
        shippingOption: "standard",
        shippingAddress: demoAddress,
        paymentIntentId: demoOrder.paymentIntentId,
        paymentLast4: "4242",
        placedAt: new Date(now - demoOrder.hoursAgo * hourMs),
      })
      .returning({ id: orders.id });

    if (!order) throw new Error("Demo order was not saved");

    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      productTitle: product.title,
      imageUrl,
      unitPriceInPence: product.priceInPence,
      quantity,
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
