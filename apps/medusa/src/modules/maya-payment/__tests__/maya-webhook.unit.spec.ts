import crypto from "crypto";
import { MedusaError, PaymentActions } from "@medusajs/framework/utils";

import MayaPaymentProviderService from "../service";
import { claimMayaWebhookDedup } from "../../../lib/maya-webhook-dedup";

jest.mock("../../../lib/maya-webhook-dedup", () => ({
  buildMayaWebhookDedupId: jest.fn((body: { requestReferenceNumber?: string }) =>
    body.requestReferenceNumber ? `maya:${body.requestReferenceNumber}` : null,
  ),
  claimMayaWebhookDedup: jest.fn(),
}));

function verifyMayaSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

describe("Maya webhook signature verification", () => {
  const secret = "test-maya-webhook-secret-2024";

  it("accepts a valid HMAC signature", () => {
    const body = JSON.stringify({
      id: "inv_001",
      paymentStatus: "PAYMENT_SUCCESS",
      requestReferenceNumber: "medusa_ps:sess_abc123",
    });
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    expect(verifyMayaSignature(body, sig, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ id: "inv_001" });
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    const tampered = JSON.stringify({ id: "inv_002" });
    expect(verifyMayaSignature(tampered, sig, secret)).toBe(false);
  });

  it("rejects an empty signature", () => {
    const body = JSON.stringify({ id: "inv_001" });
    expect(verifyMayaSignature(body, "", secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const body = JSON.stringify({ id: "inv_001" });
    const sig = crypto
      .createHmac("sha256", "wrong-secret")
      .update(body)
      .digest("hex");
    expect(verifyMayaSignature(body, sig, secret)).toBe(false);
  });

  it("rejects a signature with different length", () => {
    const body = JSON.stringify({ id: "inv_001" });
    expect(verifyMayaSignature(body, "abcdef", secret)).toBe(false);
  });
});

describe("Maya webhook service", () => {
  function createService() {
    return new MayaPaymentProviderService(
      {},
      {
        secretKey: "maya-secret",
        webhookSecret: "test-maya-webhook-secret-2024",
        publicBaseUrl: "http://localhost:3000",
      },
    );
  }

  function payload(overrides?: Record<string, unknown>): string {
    return JSON.stringify({
      paymentStatus: "PAYMENT_SUCCESS",
      requestReferenceNumber: "medusa_ps:sess_abc123",
      totalAmount: { value: "100.50" },
      ...overrides,
    });
  }

  function signature(body: string): string {
    return crypto
      .createHmac("sha256", "test-maya-webhook-secret-2024")
      .update(body)
      .digest("hex");
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("accepts valid PAYMENT_SUCCESS webhooks", async () => {
    const service = createService();
    const body = payload();
    (claimMayaWebhookDedup as jest.Mock).mockResolvedValue(true);

    const result = await service.getWebhookActionAndData({
      data: {},
      rawData: body,
      headers: { "x-maya-signature": signature(body) },
    });

    expect(result).toEqual({
      action: PaymentActions.SUCCESSFUL,
      data: { session_id: "sess_abc123", amount: 10050 },
    });
  });

  it("rejects invalid signatures", async () => {
    const service = createService();

    await expect(
      service.getWebhookActionAndData({
        data: {},
        rawData: payload(),
        headers: { "x-maya-signature": "bad" },
      }),
    ).rejects.toThrow(MedusaError);
  });

  it("returns the same success shape for duplicate deliveries", async () => {
    const service = createService();
    const body = payload();
    (claimMayaWebhookDedup as jest.Mock).mockResolvedValue(false);

    const result = await service.getWebhookActionAndData({
      data: {},
      rawData: body,
      headers: { "x-maya-signature": signature(body) },
    });

    expect(result).toEqual({
      action: PaymentActions.SUCCESSFUL,
      data: { session_id: "sess_abc123", amount: 10050 },
    });
  });

  it("ignores successful events without request reference correlation", async () => {
    const service = createService();
    const body = payload({ requestReferenceNumber: "maya-ref-only" });
    (claimMayaWebhookDedup as jest.Mock).mockResolvedValue(true);

    const result = await service.getWebhookActionAndData({
      data: {},
      rawData: body,
      headers: { "x-maya-signature": signature(body) },
    });

    expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED });
  });
});
