import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import {
  CMS_FORM_KEYS,
  getCmsFormSettings,
  insertCmsFormSubmission,
} from "@apparel-commerce/platform-data";
import { cmsFormSubmissionPayloadSchema } from "@apparel-commerce/validation";

import { createStorefrontAnonSupabase, createStorefrontServiceSupabase } from "@/lib/storefront-supabase";
import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ formKey: string }> },
) {
  const ip = getRequestIp(req);
  const rl = await rateLimitFixedWindow(`cms-form:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return Response.json(
      { error: "Too many requests", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
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
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const payloadParsed = cmsFormSubmissionPayloadSchema.safeParse(body);
  if (!payloadParsed.success) {
    return Response.json(
      { error: "Invalid form payload", details: payloadParsed.error.flatten() },
      { status: 400 },
    );
  }
  const raw = payloadParsed.data as Record<string, unknown>;
  const trap = raw._hp ?? raw._honeypot;
  if (trap != null && String(trap).trim() !== "") {
    return Response.json({ ok: true });
  }
  const payload = { ...raw };
  delete payload._hp;
  delete payload._honeypot;

  const sb = createStorefrontAnonSupabase();
  if (!sb) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const submissionId = await insertCmsFormSubmission(sb, {
    form_key: formKey,
    payload,
    ip_hash: ipHash,
  });
  if (!submissionId) return Response.json({ error: "Submit failed" }, { status: 500 });

  const svc = createStorefrontServiceSupabase();
  if (svc) {
    const settings = await getCmsFormSettings(svc);
    const wh = settings?.webhook_url?.trim();
    if (wh) {
      const hookBody = JSON.stringify({
        event: "cms_form_submission",
        form_key: formKey,
        submission_id: submissionId,
        payload,
        created_at: new Date().toISOString(),
      });
      void fetch(wh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: hookBody,
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true, id: submissionId });
}
