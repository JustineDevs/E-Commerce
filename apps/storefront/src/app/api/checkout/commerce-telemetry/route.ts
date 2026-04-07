import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  logCommerceObservabilityServer,
  type CommerceObservabilityEvent,
} from "@/lib/commerce-observability";

export const dynamic = "force-dynamic";

const ALLOWED = new Set<CommerceObservabilityEvent>([
  "checkout_quote_generated",
  "checkout_quote_changed",
  "payment_session_created",
  "payment_session_invalidated",
  "payment_session_completed",
  "payment_session_recovered",
  "checkout_provider_action_resolved",
  "checkout_tab_lease_conflict",
]);

/**
 * Client-emitted commerce observability (authenticated shoppers only).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email?.trim()) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  if (typeof event !== "string" || !ALLOWED.has(event as CommerceObservabilityEvent)) {
    return Response.json({ error: "Invalid or disallowed event" }, { status: 400 });
  }

  const { event: _e, ...rest } = body;
  logCommerceObservabilityServer(event as CommerceObservabilityEvent, {
    ...rest,
    actorEmail: session.user.email?.trim().toLowerCase(),
  });

  return Response.json({ ok: true });
}
