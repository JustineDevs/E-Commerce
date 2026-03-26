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
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "Stock must be a non-negative number." };
  }
  return { ok: true, value: Math.floor(n) };
}
