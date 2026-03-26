import { createClient } from "@supabase/supabase-js";

function anonSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function serviceSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const productSlug = u.searchParams.get("productSlug")?.trim() ?? "";
  const medusaProductId = u.searchParams.get("medusaProductId")?.trim() ?? "";
  if (!productSlug && !medusaProductId) {
    return Response.json(
      { error: "Provide productSlug and/or medusaProductId" },
      { status: 400 },
    );
  }
  const sb = anonSupabase();
  if (!sb) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
  let q = sb
    .from("product_reviews")
    .select("id,rating,author_name,body,created_at,product_slug,medusa_product_id")
    .order("created_at", { ascending: false })
    .limit(50);
  if (medusaProductId && productSlug) {
    q = q.or(
      `medusa_product_id.eq.${medusaProductId},product_slug.eq.${productSlug}`,
    );
  } else if (medusaProductId) {
    q = q.eq("medusa_product_id", medusaProductId);
  } else {
    q = q.eq("product_slug", productSlug);
  }
  const { data, error } = await q;
  if (error) {
    return Response.json({ error: "Unable to load reviews" }, { status: 500 });
  }
  const rows = data ?? [];
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    const id = String((r as { id?: string }).id ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return Response.json({ reviews: deduped });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const productSlug =
    typeof o.productSlug === "string" ? o.productSlug.trim() : "";
  const medusaProductId =
    typeof o.medusaProductId === "string" ? o.medusaProductId.trim() : "";
  const authorName =
    typeof o.authorName === "string" ? o.authorName.trim() : "";
  const reviewBody = typeof o.body === "string" ? o.body.trim() : "";
  const rating = typeof o.rating === "number" ? o.rating : Number(o.rating);
  if (!productSlug) {
    return Response.json({ error: "productSlug is required" }, { status: 400 });
  }
  if (!medusaProductId) {
    return Response.json(
      { error: "medusaProductId is required" },
      { status: 400 },
    );
  }
  if (!authorName || authorName.length > 120) {
    return Response.json({ error: "authorName is required (max 120 chars)" }, { status: 400 });
  }
  if (!reviewBody || reviewBody.length > 2000) {
    return Response.json(
      { error: "body is required (max 2000 chars)" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return Response.json({ error: "rating must be an integer 1 to 5" }, { status: 400 });
  }

  const sb = serviceSupabase();
  if (!sb) {
    return Response.json(
      { error: "Reviews submission is not configured" },
      { status: 503 },
    );
  }
  const { error } = await sb.from("product_reviews").insert({
    product_slug: productSlug,
    medusa_product_id: medusaProductId,
    rating,
    author_name: authorName,
    body: reviewBody,
  });
  if (error) {
    return Response.json({ error: "Unable to save review" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
