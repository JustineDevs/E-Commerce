import { NextResponse } from "next/server";

import { codPlaceOrderRouteLogic } from "./payment-attempt-route-logic";

type RateLimitResult =
  | { ok: true }
  | { ok: false; response: Response };

type PaymentAttemptRow = {
  cart_id: string;
  correlation_id: string;
  provider: string;
} | null;

type FinalizeResult =
  | {
      ok: true;
      orderId: string;
      redirectUrl: string;
      attempts: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
      attempts: number;
    };

export type CodPlaceOrderRouteDeps = {
  applyRateLimit: (_req: Request) => Promise<RateLimitResult>;
  readCartIdFromCookie: () => Promise<string | null>;
  getPaymentAttemptRow: (_correlationId: string) => Promise<PaymentAttemptRow>;
  incrementFinalizeAttempts: (_correlationId: string) => Promise<void>;
  updatePaymentAttempt: (
    _correlationId: string,
    _patch: Record<string, unknown>,
  ) => Promise<void>;
  finalizeMedusaCart: (_cartId: string) => Promise<FinalizeResult>;
  logEvent: (_payload: unknown) => void;
  nowIso: () => string;
};

export async function handleCodPlaceOrderRequest(
  req: Request,
  deps: CodPlaceOrderRouteDeps,
): Promise<Response> {
  const rl = await deps.applyRateLimit(req);
  if (!rl.ok) {
    return rl.response;
  }

  const cartId = await deps.readCartIdFromCookie();

  let correlationId = "";
  try {
    const body = (await req.json()) as { correlationId?: string };
    if (typeof body.correlationId === "string" && body.correlationId.trim()) {
      correlationId = body.correlationId.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const row = correlationId
    ? await deps.getPaymentAttemptRow(correlationId)
    : null;
  const result = await codPlaceOrderRouteLogic({
    correlationId,
    cartId,
    row,
    incrementFinalizeAttempts: deps.incrementFinalizeAttempts,
    updatePaymentAttempt: deps.updatePaymentAttempt,
    finalizeMedusaCart: deps.finalizeMedusaCart,
    logEvent: deps.logEvent,
    nowIso: deps.nowIso,
  });

  return NextResponse.json(result.body, { status: result.status });
}
