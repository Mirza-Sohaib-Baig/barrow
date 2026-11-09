import { asc, desc, eq } from "drizzle-orm";
import { addresses } from "@/drizzle/schema";
import type { CheckoutAddress } from "@/lib/checkout";
import { db } from "@/lib/db";

export async function getAddresses(userId: string): Promise<CheckoutAddress[]> {
  const rows = await db
    .select({
      id: addresses.id,
      fullName: addresses.fullName,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      postcode: addresses.postcode,
      country: addresses.country,
      phone: addresses.phone,
      isDefault: addresses.isDefault,
    })
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), asc(addresses.fullName));

  return rows;
}
