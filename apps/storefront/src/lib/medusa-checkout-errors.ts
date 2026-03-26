/**
 * Maps Medusa store API failures to storefront-safe messages and cleans up
 * abandoned carts after partial checkout steps.
 */

export function extractMedusaErrorText(err: unknown): string {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      response?: { data?: unknown; status?: number };
    };
    const data = anyErr.response?.data;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (typeof o.message === "string" && o.message.trim()) return o.message;
      if (typeof o.type === "string" && typeof o.message === "string")
        return o.message;
    }
    if (err.message.trim()) return err.message;
  }
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
  }
  return "";
}

export function formatMedusaCheckoutError(err: unknown): string {
  const raw = extractMedusaErrorText(err);
  const lower = raw.toLowerCase();
  if (
    lower.includes("inventory") ||
    lower.includes("stock") ||
    lower.includes("insufficient") ||
    lower.includes("not enough") ||
    lower.includes("out of stock") ||
    lower.includes("unavailable") ||
    lower.includes("reserved")
  ) {
    return "One or more items are no longer available in the requested quantity. Update your bag and try again.";
  }
  if (
    (lower.includes("variant") && lower.includes("does not")) ||
    lower.includes("invalid variant")
  ) {
    return "A product variant is no longer available. Update your bag and try again.";
  }
  if (raw.length > 0 && raw.length < 400) return raw;
  return "Checkout could not be completed. Please try again.";
}

export async function tryDeleteStoreCart(
  cartId: string,
  baseUrl: string,
  publishableKey: string,
): Promise<void> {
  const root = baseUrl.replace(/\/$/, "");
  const url = `${root}/store/carts/${encodeURIComponent(cartId)}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "x-publishable-api-key": publishableKey,
      },
    });
    if (!res.ok && process.env.NODE_ENV === "development") {
      const t = await res.text().catch(() => "");
      console.warn("[checkout] rollback DELETE cart:", res.status, t.slice(0, 200));
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[checkout] rollback DELETE cart failed:", e);
    }
  }
}
