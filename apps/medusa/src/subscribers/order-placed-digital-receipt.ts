import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function orderPlacedDigitalReceipt({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromAddr =
    process.env.RESEND_FROM_EMAIL?.trim() || "noreply@apparel-commerce.com";

  if (!supabaseUrl || !supabaseKey) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    info?: (m: string) => void;
    warn?: (m: string) => void;
  };

  const orderModule = container.resolve(Modules.ORDER);
  const order = (await orderModule.retrieveOrder(data.id, {
    relations: ["items"],
  })) as {
    id?: string;
    display_id?: number;
    email?: string;
    total?: number;
    currency_code?: string;
    created_at?: string;
    items?: Array<{
      title?: string;
      quantity?: number;
      unit_price?: number;
    }>;
  };

  const email = typeof order.email === "string" ? order.email.trim() : "";
  const items = (order.items ?? []).map((i) => ({
    title: String(i.title ?? "Item"),
    quantity: Number(i.quantity ?? 1),
    unit_price: Number(i.unit_price ?? 0),
  }));

  try {
    const { buildReceiptHtml, saveReceipt, markReceiptSent } = await import(
      "../lib/digital-receipt.js"
    );
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(supabaseUrl, supabaseKey);

    const html = buildReceiptHtml({
      id: order.id ?? data.id,
      display_id: order.display_id,
      items,
      total: Number(order.total ?? 0),
      currency_code: order.currency_code ?? "php",
      created_at: order.created_at,
      storeName: "Maharlika Apparel Custom",
    });

    const receipt = await saveReceipt(sb, {
      order_id: order.id ?? data.id,
      customer_email: email || undefined,
      receipt_html: html,
    });

    if (email && resendKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: fromAddr,
        to: email,
        subject: `Your receipt for Order #${order.display_id ?? order.id ?? data.id}`,
        html,
      });
      await markReceiptSent(sb, receipt.id);
      logger.info?.(`[receipt] sent to ${email} for order ${data.id}`);
    }
  } catch (err) {
    logger.warn?.(`[receipt] ${err instanceof Error ? err.message : String(err)}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
