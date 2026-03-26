const KEY = "maharlika_wishlist_v1";
const MAX_WISHLIST_SIZE = 200;

export type WishlistEntry = {
  slug: string;
  name: string;
  addedAt: string;
};

function readRaw(): unknown {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

export function getWishlist(): WishlistEntry[] {
  const raw = readRaw();
  if (!Array.isArray(raw)) return [];
  const out: WishlistEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.slug !== "string" || typeof o.name !== "string") continue;
    out.push({
      slug: o.slug,
      name: o.name,
      addedAt:
        typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString(),
    });
  }
  return out;
}

function write(entries: WishlistEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
}

export function wishlistContains(slug: string): boolean {
  return getWishlist().some((e) => e.slug === slug);
}

export function toggleWishlist(
  entry: Pick<WishlistEntry, "slug" | "name">,
): boolean {
  const list = getWishlist();
  const i = list.findIndex((e) => e.slug === entry.slug);
  if (i >= 0) {
    list.splice(i, 1);
    write(list);
    return false;
  }
  if (list.length >= MAX_WISHLIST_SIZE) {
    list.shift();
  }
  list.push({
    slug: entry.slug,
    name: entry.name,
    addedAt: new Date().toISOString(),
  });
  write(list);
  return true;
}

export function clearWishlist(): void {
  write([]);
}

export function exportWishlistJSON(): string {
  return JSON.stringify(getWishlist(), null, 2);
}

export function importWishlistJSON(json: string): number {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) return 0;
  const current = getWishlist();
  const slugs = new Set(current.map((e) => e.slug));
  let added = 0;
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.slug !== "string" || typeof o.name !== "string") continue;
    if (slugs.has(o.slug)) continue;
    if (current.length >= MAX_WISHLIST_SIZE) break;
    current.push({
      slug: o.slug,
      name: o.name,
      addedAt:
        typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString(),
    });
    slugs.add(o.slug);
    added++;
  }
  write(current);
  return added;
}

export function onWishlistChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function handler(e: StorageEvent) {
    if (e.key === KEY) callback();
  }
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
