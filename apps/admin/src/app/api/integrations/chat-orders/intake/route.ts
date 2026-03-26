import {
  tryCreateSupabaseClient,
  staffHasPermission,
} from "@apparel-commerce/database";
import {
  getMedusaAdminSdk,
  getMedusaRegionId,
  getMedusaSalesChannelId,
} from "@/lib/medusa-pos";
import { logAdminApiEvent } from "@/lib/admin-api-log";
import { getCorrelationId } from "@/lib/request-correlation";
import { requireStaffSession } from "@/lib/requireStaffSession";
import { correlatedJson, tagResponse } from "@/lib/staff-api-response";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type IntakeItem = { variantId: string; quantity: number };

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  const internalKey = process.env.INTERNAL_CHAT_INTAKE_KEY?.trim();
  const headerKey = req.headers.get("x-internal-key")?.trim();
  const useInternal = internalKey && headerKey === internalKey;

  if (!useInternal) {
    const staff = await requireStaffSession();
    if (!staff.ok) {
      return tagResponse(staff.response, correlationId);
    }
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!staffHasPermission(perms ?? [], "chat_orders:manage")) {
      return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    source?: string;
    raw_text?: string;
    phone?: string;
    address?: string;
    items?: IntakeItem[];
  };

  const source = typeof body.source === "string" ? body.source.trim() : "chat";
  const items = Array.isArray(body.items) ? body.items : [];

  const supabase = tryCreateSupabaseClient();
  if (!supabase) {
    return correlatedJson(
      correlationId,
      {
        error: "Supabase is not configured",
        code: "SUPABASE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }
  const { data: inserted, error: insErr } = await supabase
    .from("chat_order_intake")
    .insert({
      source,
      raw_text: typeof body.raw_text === "string" ? body.raw_text : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      address: typeof body.address === "string" ? body.address : null,
      items,
      status: "pending",
      metadata: { correlation_id: correlationId },
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted?.id) {
    logAdminApiEvent({
      route: "POST /api/integrations/chat-orders/intake",
      correlationId,
      phase: "error",
      detail: { db: insErr?.message },
    });
    return correlatedJson(
      correlationId,
      { error: insErr?.message ?? "Unable to record chat order" },
      { status: 502 },
    );
  }

  let draftOrderId: string | undefined;
  if (items.length > 0) {
    const adminSdk = getMedusaAdminSdk();
    const regionId = getMedusaRegionId();
    const salesChannelId = getMedusaSalesChannelId();
    if (adminSdk && regionId && salesChannelId) {
      try {
        const { draft_order } = await adminSdk.admin.draftOrder.create({
          email: "chat-intake@instore.local",
          region_id: regionId,
          sales_channel_id: salesChannelId,
          items: items.map((i) => ({
            variant_id: i.variantId,
            quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
          })),
          metadata: { chat_intake_id: inserted.id },
        });
        draftOrderId = draft_order?.id;
        if (draftOrderId) {
          await supabase
            .from("chat_order_intake")
            .update({
              medusa_draft_order_id: draftOrderId,
              status: "draft_created",
            })
            .eq("id", inserted.id);
        }
      } catch (e) {
        logAdminApiEvent({
          route: "POST /api/integrations/chat-orders/intake",
          correlationId,
          phase: "error",
          detail: { medusa: e instanceof Error ? e.message : String(e) },
        });
      }
    }
  }

  logAdminApiEvent({
    route: "POST /api/integrations/chat-orders/intake",
    correlationId,
    phase: "ok",
    detail: { intakeId: inserted.id },
  });

  return correlatedJson(correlationId, {
    intakeId: inserted.id,
    draftOrderId: draftOrderId ?? null,
  });
}
