import { buildPaymongoWebhookDedupId } from "../paymongo-webhook-dedup";

describe("PayMongo webhook dedup ID generation", () => {
  it("builds a dedup ID from event type and data id", () => {
    const body = {
      data: {
        id: "evt_123abc",
        attributes: { type: "payment.paid" },
      },
    };
    expect(buildPaymongoWebhookDedupId(body)).toBe(
      "paymongo:payment.paid:evt_123abc",
    );
  });

  it("returns null when data.id is missing", () => {
    const body = {
      data: { attributes: { type: "payment.paid" } },
    };
    expect(buildPaymongoWebhookDedupId(body)).toBeNull();
  });

  it("uses 'unknown' when attributes.type is missing", () => {
    const body = {
      data: { id: "evt_456def" },
    };
    expect(buildPaymongoWebhookDedupId(body)).toBe(
      "paymongo:unknown:evt_456def",
    );
  });

  it("returns null when body has no data field", () => {
    expect(buildPaymongoWebhookDedupId({})).toBeNull();
  });

  it("returns null when data is not an object", () => {
    expect(buildPaymongoWebhookDedupId({ data: "string" })).toBeNull();
  });
});
