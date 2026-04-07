import crypto from "node:crypto";

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { POST } from "./route";
import { claimAftershipWebhookDedup } from "../../../lib/aftership-webhook-dedup";
import {
  markWebhookProcessed,
  mergePaymentAttemptPayloadByMedusaOrderId,
  recordWebhookEvent,
  tryCreateSupabaseClient,
} from "../../../lib/payment-supabase-bridge";

jest.mock("../../../lib/payment-supabase-bridge", () => ({
  enqueueReconciliationJob: jest.fn(),
  findPaymentAttemptByMedusaOrderId: jest.fn(),
  markWebhookProcessed: jest.fn(),
  mergePaymentAttemptPayloadByMedusaOrderId: jest.fn(),
  PAYMENT_RECONCILIATION_JOB_TYPES: { CAPTURE_COD_PAYMENT: "capture_cod_payment" },
  recordWebhookEvent: jest.fn(),
  tryCreateSupabaseClient: jest.fn(),
}));

jest.mock("../../../lib/aftership-webhook-dedup", () => ({
  claimAftershipWebhookDedup: jest.fn(),
}));

const mockCaptureRun = jest.fn();
jest.mock("@medusajs/medusa/core-flows", () => ({
  capturePaymentWorkflow: jest.fn(() => ({ run: mockCaptureRun })),
}));

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

function createRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function createReq(rawBody: Buffer, signature: string | undefined, options?: {
  codPaymentId?: string | null;
  alreadyCaptured?: boolean;
}) {
  const logger = { info: jest.fn(), warn: jest.fn() };
  const orderModule = {
    retrieveOrder: jest.fn().mockResolvedValue({ id: "order_1", metadata: { prior: true } }),
    updateOrders: jest.fn().mockResolvedValue(undefined),
  };
  const query = {
    graph: jest.fn().mockResolvedValue({
      data: [
        {
          payment_collections: [
            {
              payments: options?.codPaymentId
                ? [
                    {
                      id: options.codPaymentId,
                      provider_id: "pp_cod_cod",
                      captured_at: null,
                    },
                  ]
                : [],
            },
          ],
        },
      ],
    }),
  };

  const scope = {
    resolve(token: unknown) {
      if (token === ContainerRegistrationKeys.LOGGER) return logger;
      if (token === ContainerRegistrationKeys.QUERY) return query;
      if (token === Modules.ORDER) return orderModule;
      throw new Error(`unexpected resolve token: ${String(token)}`);
    },
  };

  return {
    headers: {
      "aftership-hmac-sha256": signature,
    },
    rawBody,
    scope,
    __orderModule: orderModule,
    __query: query,
    __logger: logger,
  };
}

describe("AfterShip webhook route", () => {
  const secret = "aftership-secret";
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      AFTERSHIP_WEBHOOK_SECRET: secret,
    };
    (tryCreateSupabaseClient as jest.Mock).mockReturnValue({ kind: "supabase" });
    (recordWebhookEvent as jest.Mock).mockResolvedValue({ inserted: true, id: "wh_1" });
    (mergePaymentAttemptPayloadByMedusaOrderId as jest.Mock).mockResolvedValue(undefined);
    (markWebhookProcessed as jest.Mock).mockResolvedValue(undefined);
    (claimAftershipWebhookDedup as jest.Mock).mockResolvedValue(true);
    mockCaptureRun.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("rejects invalid signatures before mutation", async () => {
    const body = Buffer.from(JSON.stringify({ tracking: { order_id: "order_1" } }));
    const req = createReq(body, "bad");
    const res = createRes();

    await POST(req as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(recordWebhookEvent).not.toHaveBeenCalled();
    expect(markWebhookProcessed).not.toHaveBeenCalled();
  });

  it("updates order metadata and ledger exactly once for a shipped event", async () => {
    const payload = JSON.stringify({
      tracking: {
        order_id: "order_1",
        id: "trk_1",
        tag: "InTransit",
        checkpoints: [{ message: "Package moving", checkpoint_time: "2026-04-06T00:00:00Z" }],
      },
    });
    const req = createReq(Buffer.from(payload), sign(payload, secret));
    const res = createRes();

    await POST(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(recordWebhookEvent).toHaveBeenCalledTimes(1);
    expect(mergePaymentAttemptPayloadByMedusaOrderId).toHaveBeenCalledTimes(1);
    expect(markWebhookProcessed).toHaveBeenCalledWith({ kind: "supabase" }, "wh_1", true);
    expect(req.__orderModule.updateOrders).toHaveBeenCalledTimes(1);
    expect(mockCaptureRun).not.toHaveBeenCalled();
  });

  it("captures COD exactly once on delivered events", async () => {
    const payload = JSON.stringify({
      tracking: {
        order_id: "order_1",
        id: "trk_1",
        tag: "Delivered",
      },
    });
    const req = createReq(Buffer.from(payload), sign(payload, secret), {
      codPaymentId: "pay_1",
    });
    const res = createRes();

    await POST(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(mockCaptureRun).toHaveBeenCalledWith({ input: { payment_id: "pay_1" } });
    expect(mergePaymentAttemptPayloadByMedusaOrderId).toHaveBeenCalled();
    expect(markWebhookProcessed).toHaveBeenCalledWith({ kind: "supabase" }, "wh_1", true);
  });

  it("returns duplicate without reapplying mutations", async () => {
    (claimAftershipWebhookDedup as jest.Mock).mockResolvedValue(false);
    const payload = JSON.stringify({
      tracking: {
        order_id: "order_1",
        id: "trk_1",
        tag: "Delivered",
      },
    });
    const req = createReq(Buffer.from(payload), sign(payload, secret));
    const res = createRes();

    await POST(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true, duplicate: true });
    expect(recordWebhookEvent).not.toHaveBeenCalled();
    expect(req.__orderModule.updateOrders).not.toHaveBeenCalled();
  });
});
