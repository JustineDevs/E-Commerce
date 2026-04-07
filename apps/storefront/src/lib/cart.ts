export type CartLine = {
  variantId: string;
  quantity: number;
  slug: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  price: number;
};

/** Browser-only bag until checkout builds a Medusa cart; line prices here are for display. */
const STORAGE_KEY = "apparel-commerce-cart-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function normalizeCartLine(line: unknown): CartLine | null {
  if (!line || typeof line !== "object") return null;
  const row = line as Partial<CartLine>;
  const variantId = typeof row.variantId === "string" ? row.variantId.trim() : "";
  const quantity =
    typeof row.quantity === "number" && Number.isFinite(row.quantity)
      ? Math.floor(row.quantity)
      : 0;
  if (!variantId || quantity < 1) return null;
  return {
    variantId,
    quantity,
    slug: typeof row.slug === "string" ? row.slug.trim() : "",
    name: typeof row.name === "string" ? row.name.trim() : "",
    sku: typeof row.sku === "string" ? row.sku.trim() : "",
    size: typeof row.size === "string" ? row.size.trim() : "",
    color: typeof row.color === "string" ? row.color.trim() : "",
    price:
      typeof row.price === "number" && Number.isFinite(row.price) ? row.price : 0,
  };
}

export function normalizeCartLines(lines: unknown): CartLine[] {
  if (!Array.isArray(lines)) return [];
  const merged = new Map<string, CartLine>();
  for (const rawLine of lines) {
    const line = normalizeCartLine(rawLine);
    if (!line) continue;
    const current = merged.get(line.variantId);
    if (current) {
      merged.set(line.variantId, {
        ...line,
        quantity: current.quantity + line.quantity,
      });
      continue;
    }
    merged.set(line.variantId, line);
  }
  return [...merged.values()];
}

export function readCart(): CartLine[] {
  if (!isBrowser()) return [];
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return [];
  }
  const normalized = normalizeCartLines(parsed);
  if (!Array.isArray(parsed) || normalized.length !== parsed.length) {
    writeCart(normalized);
  }
  return normalized;
}

export function writeCart(lines: CartLine[]): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCartLines(lines)));
}

export function addCartLine(line: CartLine): void {
  const cur = readCart();
  const normalizedLine = normalizeCartLine(line);
  if (!normalizedLine) return;
  const idx = cur.findIndex((c) => c.variantId === normalizedLine.variantId);
  if (idx >= 0) {
    cur[idx] = {
      ...normalizedLine,
      quantity: cur[idx].quantity + normalizedLine.quantity,
    };
  } else {
    cur.push(normalizedLine);
  }
  writeCart(cur);
}

export function updateLineQuantity(variantId: string, quantity: number): void {
  const cur = readCart();
  if (quantity <= 0) {
    writeCart(cur.filter((c) => c.variantId !== variantId));
    return;
  }
  writeCart(
    cur.map((c) => (c.variantId === variantId ? { ...c, quantity } : c)),
  );
}

export function clearCart(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(STORAGE_KEY);
}
