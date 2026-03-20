import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(params: { orderNumber: string; trackingUrl: string; brandName: string }): string {
  const safeNum = escapeHtml(params.orderNumber);
  const safeUrl = escapeHtml(params.trackingUrl);
  const brand = escapeHtml(params.brandName);
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1e293b;">
  <p style="font-size:14px;color:#64748b;">${brand}</p>
  <h1 style="font-size:20px;">Continue checkout &amp; track your order</h1>
  <p>Order <strong>${safeNum}</strong> is reserved. Complete payment on the next page, then use your private tracking link anytime:</p>
  <p><a href="${safeUrl}" style="color:#0f766e;font-weight:600;">View order status &amp; shipments</a></p>
  <p style="font-size:13px;color:#64748b;">Keep this link — it contains a security code. Do not share it publicly.</p>
</body></html>`;
}

export async function sendCheckoutTrackingEmail(params: {
  to: string;
  orderNumber: string;
  trackingUrl: string;
}): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const brand = process.env.RESEND_BRAND_NAME?.trim() || "Maharlika Apparel Custom";

  if (!key || !from) {
    return { sent: false };
  }

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: params.to.trim(),
    subject: `Your order ${params.orderNumber} — secure tracking link`,
    html: buildHtml({
      orderNumber: params.orderNumber,
      trackingUrl: params.trackingUrl,
      brandName: brand,
    }),
  });

  if (error) {
    console.error("RESEND_EMAIL_ERROR", error.message ?? error);
    return { sent: false };
  }
  return { sent: true };
}
