import { buildAftershipWebhookDedupId } from "../aftership-webhook-dedup";

describe("AfterShip webhook dedup ID generation", () => {
  it("builds a dedup ID from orderId and tag", () => {
    expect(buildAftershipWebhookDedupId("order_abc", "Delivered")).toBe(
      "aftership:order_abc:Delivered",
    );
  });

  it("uses 'unknown' when tag is undefined", () => {
    expect(buildAftershipWebhookDedupId("order_xyz", undefined)).toBe(
      "aftership:order_xyz:unknown",
    );
  });

  it("handles empty orderId", () => {
    expect(buildAftershipWebhookDedupId("", "InTransit")).toBe(
      "aftership::InTransit",
    );
  });
});
