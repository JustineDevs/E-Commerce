import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(params: {
  orderNumber: string;
  trackingUrl: string;
  brandName: string;
}): string {
  const safeNum = escapeHtml(params.orderNumber);
  const safeUrl = escapeHtml(params.trackingUrl);
  const brand = escapeHtml(params.brandName);
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1e293b;">
 <p style="font-size:14px;color:#64748b;">${brand}</p>
 <h1 style="font-size:20px;">Order placed</h1>
 <p>Order <strong>${safeNum}</strong> is confirmed. Track status anytime:</p>
 <p><a href="${safeUrl}" style="color:#0f766e;font-weight:600;">View order status &amp; shipments</a></p>
</body></html>`;
}

export default async function orderPlacedResendEmail({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const brand =
    process.env.RESEND_BRAND_NAME?.trim() || "Maharlika Apparel Custom";
  const storefrontBase =
    process.env.STOREFRONT_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  if (!key || !from || !storefrontBase) {
    return;
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn?: (m: string) => void;
  };

  const orderModule = container.resolve(Modules.ORDER);
  const order = await orderModule.retrieveOrder(data.id, {
    relations: ["customer"],
  });

  const emailRaw =
    (typeof order.email === "string" && order.email.trim()) ||
    (order.customer &&
    typeof order.customer === "object" &&
    order.customer !== null &&
    "email" in order.customer &&
    typeof (order.customer as { email?: string }).email === "string"
      ? (order.customer as { email: string }).email.trim()
      : "") ||
    "";

  if (!emailRaw) {
    logger.warn?.(`[resend] order ${data.id} has no email; skip notification.`);
    return;
  }

  const orderNumber =
    order.display_id != null ? String(order.display_id) : (order.id ?? data.id);
  const trackingUrl = `${storefrontBase.replace(/\/$/, "")}/track/${encodeURIComponent(String(order.id))}`;

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: emailRaw,
    subject: `Your order ${orderNumber}: tracking`,
    html: buildHtml({
      orderNumber,
      trackingUrl,
      brandName: brand,
    }),
  });

  if (error) {
    logger.warn?.(`[resend] ${error.message ?? String(error)}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
