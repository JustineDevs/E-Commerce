import { correlatedError, correlatedJson, tagResponse } from "./staff-api-response";
import type { PosCommitSaleInput, PosCommitSaleRouteResult } from "./pos-commit-sale-route-logic";

type StaffResult =
  | { ok: true }
  | { ok: false; response: Response };

export type PosCommitSaleRouteDeps = {
  getCorrelationId: (_req: Request) => string;
  requireStaffApiSession: (_permission: string) => Promise<StaffResult>;
  logAdminApiEvent: (_payload: Record<string, unknown>) => void;
  getIdempotencyKey: (_req: Request) => string | undefined;
  getCompletedReplayOrderNumber: (_key: string) => string | undefined;
  isInflight: (_key: string) => boolean;
  startInflight: (_key: string) => void;
  clearInflight: (_key: string) => void;
  executeCommitSale: (_input: {
    body: PosCommitSaleInput;
    correlationId: string;
    idempotencyKey?: string;
  }) => Promise<PosCommitSaleRouteResult>;
};

export async function handlePosCommitSaleRequest(
  req: Request,
  deps: PosCommitSaleRouteDeps,
): Promise<Response> {
  const correlationId = deps.getCorrelationId(req);
  const staff = await deps.requireStaffApiSession("pos:use");
  if (!staff.ok) {
    return tagResponse(staff.response as Response, correlationId);
  }

  deps.logAdminApiEvent({
    route: "POST /api/pos/medusa/commit-sale",
    correlationId,
    phase: "start",
  });

  const idempotencyKey = deps.getIdempotencyKey(req)?.trim();
  if (idempotencyKey) {
    const replay = deps.getCompletedReplayOrderNumber(idempotencyKey);
    if (replay) {
      deps.logAdminApiEvent({
        route: "POST /api/pos/medusa/commit-sale",
        correlationId,
        phase: "ok",
        detail: { orderNumber: replay, idempotent: true, replay: true },
      });
      return correlatedJson(correlationId, {
        orderNumber: replay,
        idempotent: true,
      });
    }

    if (deps.isInflight(idempotencyKey)) {
      return correlatedError(
        correlationId,
        409,
        "Duplicate request in flight",
        "CONFLICT",
      );
    }
    deps.startInflight(idempotencyKey);
  }

  const body = (await req.json().catch(() => ({}))) as PosCommitSaleInput;

  try {
    const result = await deps.executeCommitSale({
      body,
      correlationId,
      idempotencyKey,
    });

    deps.logAdminApiEvent({
      route: "POST /api/pos/medusa/commit-sale",
      correlationId,
      phase: result.logPhase,
      detail: result.logDetail,
    });

    if (result.logPhase === "error") {
      return correlatedError(
        correlationId,
        result.status,
        result.body.error,
        result.body.code,
      );
    }

    return correlatedJson(correlationId, result.body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unable to complete POS sale";
    deps.logAdminApiEvent({
      route: "POST /api/pos/medusa/commit-sale",
      correlationId,
      phase: "error",
      detail: { message: msg },
    });
    return correlatedError(correlationId, 502, msg, "INTERNAL_ERROR");
  } finally {
    if (idempotencyKey) deps.clearInflight(idempotencyKey);
  }
}
