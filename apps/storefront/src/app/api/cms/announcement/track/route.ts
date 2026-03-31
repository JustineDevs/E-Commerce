import { NextRequest } from "next/server";
import { incrementCmsAnnouncementMetric } from "@apparel-commerce/platform-data";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

const ALLOWED = new Set(["impression", "click", "dismiss"]);

export async function POST(req: NextRequest) {
  const sb = createStorefrontServiceSupabase();
  if (!sb) {
    return new Response(JSON.stringify({ ok: false }), { status: 503 });
  }
  let body: { id?: string; locale?: string; metric?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const locale = typeof body.locale === "string" ? body.locale.trim() || "en" : "en";
  const metricRaw = typeof body.metric === "string" ? body.metric.trim() : "";
  if (!id || !ALLOWED.has(metricRaw)) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }
  const metric =
    metricRaw === "impression"
      ? "impressions"
      : metricRaw === "click"
        ? "clicks"
        : "dismisses";
  await incrementCmsAnnouncementMetric(sb, id, locale, metric);
  return Response.json({ ok: true });
}
