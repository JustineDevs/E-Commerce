const KEY = "maharlika_wishlist_v1";

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
  list.push({
    slug: entry.slug,
    name: entry.name,
    addedAt: new Date().toISOString(),
  });
  write(list);
  return true;
}
