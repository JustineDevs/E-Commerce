/**
 * Parse optional stock from catalog API JSON bodies (create/update product).
 */
export function parseOptionalStockQuantity(
  body: Record<string, unknown>,
):
  | { ok: true; value: number | undefined }
  | { ok: false; error: string } {
  if (!("stockQuantity" in body)) return { ok: true, value: undefined };
  const raw = body.stockQuantity;
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "Stock must be a non-negative whole number." };
  }
  if (!Number.isInteger(n)) {
    return { ok: false, error: "Stock must be a whole number (no decimals)." };
  }
  return { ok: true, value: n };
}

export type ParsedVariantStockRow = { variantId: string; quantity: number };

/**
 * Optional per-variant stock overrides from PATCH bodies.
 */
export function parseOptionalVariantStocks(
  body: Record<string, unknown>,
):
  | { ok: true; value: ParsedVariantStockRow[] | undefined }
  | { ok: false; error: string } {
  if (!("variantStocks" in body)) return { ok: true, value: undefined };
  const raw = body.variantStocks;
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "variantStocks must be an array." };
  }
  const out: ParsedVariantStockRow[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") {
      return { ok: false, error: `Invalid variantStocks entry at index ${i}.` };
    }
    const o = item as Record<string, unknown>;
    const variantId =
      typeof o.variantId === "string" ? o.variantId.trim() : "";
    if (!variantId) {
      return {
        ok: false,
        error: `variantStocks[${i}]: variantId is required.`,
      };
    }
    const qRaw = o.quantity;
    const n =
      typeof qRaw === "number" ? qRaw : Number(String(qRaw ?? "").trim());
    if (!Number.isFinite(n) || n < 0) {
      return {
        ok: false,
        error: `Stock for variant ${variantId} must be a non-negative whole number.`,
      };
    }
    if (!Number.isInteger(n)) {
      return {
        ok: false,
        error: `Stock for variant ${variantId} must be a whole number (no decimals).`,
      };
    }
    out.push({ variantId, quantity: n });
  }
  return { ok: true, value: out };
}
