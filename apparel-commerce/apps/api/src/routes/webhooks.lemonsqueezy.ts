import { Router } from "express";
import crypto from "crypto";
import type { Request, Response } from "express";
import { createSupabaseClient, processLemonSqueezyOrderWebhook } from "@apparel-commerce/database";
import { logSecurityEvent } from "../lib/securityEvent.js";

export const lemonsqueezyWebhookRouter: ReturnType<typeof Router> = Router();

function verifySignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) {
    return false;
  }
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

lemonsqueezyWebhookRouter.post("/", async (req: Request, res: Response) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Webhook signing not configured", code: "WEBHOOK_DISABLED" });
    return;
  }

  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    res.status(400).json({ error: "Invalid body", code: "INVALID_BODY" });
    return;
  }

  const signature = req.headers["x-signature"] as string | undefined;
  if (!verifySignature(raw, signature, secret)) {
    logSecurityEvent("webhook_signature_rejected", req, { provider: "lemonsqueezy" });
    res.status(401).json({ error: "Invalid signature", code: "INVALID_WEBHOOK_SIGNATURE" });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Invalid JSON", code: "INVALID_JSON" });
    return;
  }

  const eventType = (payload.meta as { event_name?: string } | undefined)?.event_name ?? "unknown";
  const supabase = createSupabaseClient();

  const eventId = crypto.createHash("sha256").update(Buffer.concat([Buffer.from("lemonsqueezy\0"), raw])).digest("hex");

  const { error } = await supabase.from("webhook_events").insert({
    provider: "lemonsqueezy",
    event_id: eventId,
    event_type: eventType,
    signature: signature ?? null,
    payload,
    status: "received",
  });

  if (error) {
    if (error.code === "23505") {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    console.error("webhook_events insert", error.message);
    res.status(500).json({ error: "Persist failed", code: "WEBHOOK_LOG_ERROR" });
    return;
  }

  try {
    await processLemonSqueezyOrderWebhook(supabase, payload);
    const { error: upErr } = await supabase
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("provider", "lemonsqueezy")
      .eq("event_id", eventId);
    if (upErr) {
      console.error("webhook_events processed update", upErr.message);
    }
    res.status(200).json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("lemonsqueezy process", msg);
    await supabase
      .from("webhook_events")
      .update({ status: "failed", processed_at: new Date().toISOString() })
      .eq("provider", "lemonsqueezy")
      .eq("event_id", eventId);
    res.status(500).json({ error: "Processing failed", code: "WEBHOOK_PROCESS_ERROR" });
  }
});
