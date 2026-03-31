import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safePaymentConnectionClientError } from "./payment-connection-api-errors";

describe("safePaymentConnectionClientError", () => {
  it("returns generic text for decrypt failures", () => {
    const s = safePaymentConnectionClientError(
      new Error("Unsupported envelope version"),
    );
    assert.ok(s.includes("stored credentials"));
    assert.ok(!s.includes("envelope"));
  });

  it("passes through short PSP messages", () => {
    assert.equal(
      safePaymentConnectionClientError(new Error("Stripe verify failed (401).")),
      "Stripe verify failed (401).",
    );
  });
});
