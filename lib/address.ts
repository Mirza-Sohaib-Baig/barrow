import type { AddressSnapshot } from "@/drizzle/schema";

const outwardPattern = /^[A-Z]{1,2}\d[A-Z\d]?$/;
const inwardPattern = /^\d[A-Z]{2}$/;

export function normalizeUkPostcode(value: string): string | null {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length < 5 || compact.length > 7) return null;
  const inward = compact.slice(-3);
  const outward = compact.slice(0, -3);
  if (!outwardPattern.test(outward) || !inwardPattern.test(inward)) return null;
  return `${outward} ${inward}`;
}

export function normalizeUkPhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^\+44\d{9,10}$/.test(compact)) return compact;
  if (/^0\d{9,10}$/.test(compact)) return compact;
  return null;
}

export type AddressInput = {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  phone: string;
};

export function parseAddress(
  input: AddressInput,
): { ok: true; data: AddressSnapshot } | { ok: false; field: keyof AddressInput; error: string } {
  const fullName = input.fullName.trim();
  const line1 = input.line1.trim();
  const line2 = input.line2?.trim() ?? "";
  const city = input.city.trim();
  const postcode = normalizeUkPostcode(input.postcode);
  const phone = normalizeUkPhone(input.phone);

  if (fullName.length < 1 || fullName.length > 80) {
    return { ok: false, field: "fullName", error: "Enter the name for this address." };
  }
  if (line1.length < 1 || line1.length > 120) {
    return { ok: false, field: "line1", error: "Enter the first line of the address." };
  }
  if (line2.length > 120) {
    return { ok: false, field: "line2", error: "That second line is too long." };
  }
  if (city.length < 1 || city.length > 80) {
    return { ok: false, field: "city", error: "Enter a town or city." };
  }
  if (!postcode) {
    return { ok: false, field: "postcode", error: "Enter a UK postcode, such as SW1A 1AA." };
  }
  if (!phone) {
    return { ok: false, field: "phone", error: "Enter a UK phone number." };
  }

  return {
    ok: true,
    data: {
      fullName,
      line1,
      line2: line2.length > 0 ? line2 : null,
      city,
      postcode,
      country: "GB",
      phone,
    },
  };
}
