import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { CMS_FORM_KEYS, insertCmsFormSubmission } from "@apparel-commerce/platform-data";

function anonSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ formKey: string }> },
) {
  const { formKey } = await ctx.params;
  if (!CMS_FORM_KEYS.includes(formKey as (typeof CMS_FORM_KEYS)[number])) {
    return Response.json({ error: "Unknown form" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const sb = anonSupabase();
  if (!sb) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const ok = await insertCmsFormSubmission(sb, {
    form_key: formKey,
    payload: body as Record<string, unknown>,
    ip_hash: ipHash,
  });
  if (!ok) return Response.json({ error: "Submit failed" }, { status: 500 });
  return Response.json({ ok: true });
}
