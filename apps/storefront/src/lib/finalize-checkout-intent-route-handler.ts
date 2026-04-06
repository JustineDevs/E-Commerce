import { NextResponse } from "next/server";

import { finalizeCheckoutIntentRouteLogic } from "./payment-attempt-route-logic";

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

export type FinalizeCheckoutIntentRouteDeps = {
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

export async function handleFinalizeCheckoutIntentRequest(
  req: Request,
  correlationId: string,
  deps: FinalizeCheckoutIntentRouteDeps,
): Promise<Response> {
  const rl = await deps.applyRateLimit(req);
  if (!rl.ok) {
    return rl.response;
  }

  const cartId = await deps.readCartIdFromCookie();
  const row = correlationId.trim()
    ? await deps.getPaymentAttemptRow(correlationId.trim())
    : null;

  const result = await finalizeCheckoutIntentRouteLogic({
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
