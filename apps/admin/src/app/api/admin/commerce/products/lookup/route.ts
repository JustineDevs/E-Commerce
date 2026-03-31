import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";
import { medusaAdminFetch } from "@/lib/medusa-admin-http";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

function pickThumb(p: Record<string, unknown>): string | null {
  const img = p.thumbnail ?? p.thumbnail_url;
  if (typeof img === "string" && img) return img;
  const imgs = p.images;
  if (Array.isArray(imgs) && imgs[0] && typeof imgs[0] === "object") {
    const u = (imgs[0] as { url?: string }).url;
    if (typeof u === "string") return u;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  const can =
    staffSessionAllows(session, "catalog:read") || staffSessionAllows(session, "content:read");
  if (!can) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const collectionId = sp.get("collection_id")?.trim();
  const published = sp.get("published");
  const limit = Math.min(Number(sp.get("limit")) || 40, 80);
  try {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (q) params.set("q", q);
    params.set(
      "fields",
      "+id,+title,+handle,+thumbnail,+status,+variants,*variants,*variants.prices,*categories",
    );
    const path = `/admin/products?${params.toString()}`;
    const res = await medusaAdminFetch(path);
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return correlatedJson(
        cid,
        {
          error:
            typeof json.message === "string" ? json.message : (res.statusText ?? "Catalog error"),
        },
        { status: res.status },
      );
    }
    const productsRaw = json.products;
    const productsIn = Array.isArray(productsRaw) ? productsRaw : [];
    const products = productsIn.map((raw) => {
      const p = raw as Record<string, unknown>;
      const variants = Array.isArray(p.variants) ? p.variants : [];
      const firstSku =
        variants[0] && typeof variants[0] === "object"
          ? String((variants[0] as { sku?: string }).sku ?? "")
          : "";
      const cats = Array.isArray(p.categories) ? p.categories : [];
      const catIds = cats
        .map((c) => (c && typeof c === "object" ? String((c as { id?: string }).id ?? "") : ""))
        .filter(Boolean);
      return {
        id: String(p.id ?? ""),
        title: String(p.title ?? ""),
        handle: String(p.handle ?? ""),
        sku: firstSku,
        status: String(p.status ?? ""),
        thumbnail_url: pickThumb(p),
        category_ids: catIds,
      };
    });
    let filtered = products;
    if (collectionId) {
      filtered = filtered.filter((p) => p.category_ids.includes(collectionId));
    }
    if (published === "1" || published === "true") {
      filtered = filtered.filter((p) => p.status === "published");
    }
    if (published === "0" || published === "false") {
      filtered = filtered.filter((p) => p.status !== "published");
    }
    return correlatedJson(cid, { data: { products: filtered } });
  } catch (e) {
    return correlatedJson(
      cid,
      { error: e instanceof Error ? e.message : "Store catalog request unavailable" },
      { status: 502 },
    );
  }
}
