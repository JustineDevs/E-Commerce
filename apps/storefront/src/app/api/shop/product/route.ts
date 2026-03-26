import { NextResponse } from "next/server";
import { fetchProductBySlug } from "@/lib/catalog-fetch";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  const res = await fetchProductBySlug(slug);
  if (res.kind === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (res.kind !== "ok") {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 },
    );
  }
  return NextResponse.json({ product: res.product });
}
