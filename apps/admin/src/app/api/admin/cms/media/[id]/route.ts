import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import {
  CMS_MEDIA_TAG_CATALOG_PRODUCT,
  cmsMediaRowIsCatalogProduct,
  findCmsMediaReferences,
  getCmsMediaById,
  softDeleteCmsMedia,
  updateCmsMedia,
} from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { findMedusaProductMediaReferences } from "@/lib/medusa-product-media-refs";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const cid = getCorrelationId(req);
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  const canContentRead = staffSessionAllows(session, "content:read");
  const canCatalogRead =
    staffSessionAllows(session, "catalog:read") ||
    staffSessionAllows(session, "catalog:write");
  const mode = req.nextUrl.searchParams.get("refs");
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const row = await getCmsMediaById(sup.client, id);
  if (!row) return correlatedJson(cid, { error: "Not found" }, { status: 404 });
  const isCatalog = cmsMediaRowIsCatalogProduct(row);
  if (!canContentRead && !(isCatalog && canCatalogRead)) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  if (mode === "1") {
    const [cmsRefs, medusaRefs] = await Promise.all([
      findCmsMediaReferences(sup.client, row.public_url),
      findMedusaProductMediaReferences(row.public_url),
    ]);
    const refs = [...cmsRefs, ...medusaRefs];
    return correlatedJson(cid, { data: { row, refs } });
  }
  return correlatedJson(cid, { data: row });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const cid = getCorrelationId(req);
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  const canContentWrite = staffSessionAllows(session, "content:write");
  const canCatalogWrite = staffSessionAllows(session, "catalog:write");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return correlatedJson(cid, { error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as { alt_text?: string | null; display_name?: string | null; tags?: string[] };
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const existing = await getCmsMediaById(sup.client, id);
  if (!existing) return correlatedJson(cid, { error: "Not found" }, { status: 404 });
  const isCatalog = cmsMediaRowIsCatalogProduct(existing);
  if (!canContentWrite && !(isCatalog && canCatalogWrite)) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  let tags = b.tags;
  if (isCatalog && !canContentWrite && tags !== undefined) {
    const merged = new Set(tags);
    merged.add(CMS_MEDIA_TAG_CATALOG_PRODUCT);
    tags = Array.from(merged);
  }
  const row = await updateCmsMedia(sup.client, id, {
    alt_text: b.alt_text,
    display_name: b.display_name,
    tags,
  });
  if (!row) return correlatedJson(cid, { error: "Unable to update" }, { status: 500 });
  return correlatedJson(cid, { data: row });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const cid = getCorrelationId(_req);
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  const canContentWrite = staffSessionAllows(session, "content:write");
  const canCatalogWrite = staffSessionAllows(session, "catalog:write");
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const existing = await getCmsMediaById(sup.client, id);
  if (!existing) return correlatedJson(cid, { error: "Not found" }, { status: 404 });
  const isCatalog = cmsMediaRowIsCatalogProduct(existing);
  if (!canContentWrite && !(isCatalog && canCatalogWrite)) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const ok = await softDeleteCmsMedia(sup.client, id);
  if (!ok) return correlatedJson(cid, { error: "Unable to delete" }, { status: 500 });
  return correlatedJson(cid, { ok: true });
}
