import { Router } from "express";
import crypto from "crypto";
import type { Request, Response } from "express";
import { createSupabaseClient, upsertShipmentFromAftershipPayload } from "@apparel-commerce/database";
import { logSecurityEvent } from "../lib/securityEvent.js";

export const aftershipWebhookRouter: ReturnType<typeof Router> = Router();

function verifyAftershipHmac(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) {
    return false;
  }
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
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

aftershipWebhookRouter.post("/", async (req: Request, res: Response) => {
  const secret = process.env.AFTERSHIP_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Webhook signing not configured", code: "WEBHOOK_DISABLED" });
    return;
  }

  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    res.status(400).json({ error: "Invalid body", code: "INVALID_BODY" });
    return;
  }

  const signature =
    (req.headers["aftership-hmac-sha256"] as string | undefined) ??
    (req.headers["x-aftership-signature"] as string | undefined);

  if (!verifyAftershipHmac(raw, signature, secret)) {
    logSecurityEvent("webhook_signature_rejected", req, { provider: "aftership" });
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

  const supabase = createSupabaseClient();
  const msg = payload.msg as { event?: string } | undefined;
  const eventType = msg?.event ?? "unknown";

  const eventId = crypto.createHash("sha256").update(Buffer.concat([Buffer.from("aftership\0"), raw])).digest("hex");

  const { error } = await supabase.from("webhook_events").insert({
    provider: "aftership",
    event_id: eventId,
    event_type: String(eventType),
    signature: signature ?? null,
    payload,
    status: "received",
  });

  if (error && error.code !== "23505") {
    console.error("webhook_events insert", error.message);
    res.status(500).json({ error: "Persist failed", code: "WEBHOOK_LOG_ERROR" });
    return;
  }

  try {
    const { updated } = await upsertShipmentFromAftershipPayload(supabase, payload);
    await supabase
      .from("webhook_events")
      .update({
        status: updated ? "processed" : "received",
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "aftership")
      .eq("event_id", eventId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("aftership shipment upsert", msg);
    await supabase
      .from("webhook_events")
      .update({ status: "failed", processed_at: new Date().toISOString() })
      .eq("provider", "aftership")
      .eq("event_id", eventId);
    res.status(500).json({ error: "Shipment update failed", code: "AFTERSHIP_PROCESS_ERROR" });
    return;
  }

  res.status(200).json({ received: true });
});
