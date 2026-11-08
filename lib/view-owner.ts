import { cookies } from "next/headers";
import { config } from "@/lib/config";

export type ViewOwner = { userId: string } | { sessionKey: string };

export async function readViewOwner(): Promise<ViewOwner | null> {
  const jar = await cookies();
  const guest = jar.get(config.guestCookie)?.value;
  if (!guest || !/^[\w-]{8,200}$/.test(guest)) return null;
  return { sessionKey: guest };
}
