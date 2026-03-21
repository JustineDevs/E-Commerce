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

const STORAGE_KEY = "apparel-commerce-cart-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readCart(): CartLine[] {
  if (!isBrowser()) return [];
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (row): row is CartLine =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as CartLine).variantId === "string" &&
      typeof (row as CartLine).quantity === "number",
  );
}

export function writeCart(lines: CartLine[]): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

export function addCartLine(line: CartLine): void {
  const cur = readCart();
  const idx = cur.findIndex((c) => c.variantId === line.variantId);
  if (idx >= 0) {
    cur[idx] = { ...cur[idx], quantity: cur[idx].quantity + line.quantity };
  } else {
    cur.push({ ...line });
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
