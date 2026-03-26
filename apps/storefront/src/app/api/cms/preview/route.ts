import { NextRequest } from "next/server";
import {
  createSupabaseClient,
  getCmsBlogPostBySlugPreview,
  getCmsPageBySlugPreview,
} from "@apparel-commerce/platform-data";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const locale = req.nextUrl.searchParams.get("locale") ?? "en";
  const token = req.nextUrl.searchParams.get("token");
  const kind = req.nextUrl.searchParams.get("kind") ?? "page";
  if (!slug?.trim() || !token?.trim()) {
    return Response.json({ error: "slug and token required" }, { status: 400 });
  }
  let sb: ReturnType<typeof createSupabaseClient>;
  try {
    sb = createSupabaseClient();
  } catch {
    return Response.json({ error: "Server configuration" }, { status: 503 });
  }
  if (kind === "blog") {
    const row = await getCmsBlogPostBySlugPreview(sb, slug, locale, token);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ kind: "blog", data: row });
  }
  const row = await getCmsPageBySlugPreview(sb, slug, locale, token);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ kind: "page", data: row });
}
