"use server";

export async function startBuyNow(
  _input: unknown,
): Promise<{ ok: true; data: { href: string } } | { ok: false; error: string }> {
  return { ok: false, error: "Buy now is not available yet." };
}
