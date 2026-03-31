import { buildMayaWebhookDedupId } from "../maya-webhook-dedup";

describe("Maya webhook dedup ID generation", () => {
  it("builds a dedup ID from id and paymentStatus", () => {
    const body = { id: "txn_001", paymentStatus: "PAYMENT_SUCCESS" };
    expect(buildMayaWebhookDedupId(body)).toBe(
      "maya:PAYMENT_SUCCESS:txn_001",
    );
  });

  it("falls back to checkoutId when id is missing", () => {
    const body = { checkoutId: "chk_002", paymentStatus: "PAYMENT_SUCCESS" };
    expect(buildMayaWebhookDedupId(body)).toBe(
      "maya:PAYMENT_SUCCESS:chk_002",
    );
  });

  it("returns null when both id and checkoutId are missing", () => {
    const body = { paymentStatus: "PAYMENT_SUCCESS" };
    expect(buildMayaWebhookDedupId(body)).toBeNull();
  });

  it("uses 'unknown' when paymentStatus is missing", () => {
    const body = { id: "txn_003" };
    expect(buildMayaWebhookDedupId(body)).toBe("maya:unknown:txn_003");
  });

  it("prefers id over checkoutId", () => {
    const body = {
      id: "txn_004",
      checkoutId: "chk_004",
      paymentStatus: "AUTHORIZED",
    };
    expect(buildMayaWebhookDedupId(body)).toBe("maya:AUTHORIZED:txn_004");
  });
});
