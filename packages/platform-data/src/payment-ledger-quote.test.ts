import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeNextQuoteVersionForFingerprintPatch,
  paymentAttemptMatchesCatalogMutation,
  shouldReusePaymentAttempt,
} from "./payment-ledger.js";

describe("payment-ledger quote helpers", () => {
  it("reuses only when cart row fingerprint matches (after cartId+provider lookup)", () => {
    assert.equal(
      shouldReusePaymentAttempt(
        { quote_fingerprint: "qf_live" },
        { quoteFingerprint: "qf_live" },
      ),
      true,
    );
    assert.equal(
      shouldReusePaymentAttempt(
        { quote_fingerprint: "qf_old" },
        { quoteFingerprint: "qf_new" },
      ),
      false,
    );
    assert.equal(
      shouldReusePaymentAttempt({ quote_fingerprint: "" }, { quoteFingerprint: "qf_new" }),
      false,
    );
    assert.equal(
      shouldReusePaymentAttempt({ quote_fingerprint: "   " }, { quoteFingerprint: "x" }),
      false,
    );
  });

  it("matches catalog mutations by overlapping variant or product ids", () => {
    const row = {
      provider_payload: {
        quote: {
          variant_ids: ["variant_1", "variant_2"],
          product_ids: ["prod_1"],
        },
      },
    };

    assert.equal(
      paymentAttemptMatchesCatalogMutation(row, { variantIds: ["variant_2"] }),
      true,
    );
    assert.equal(
      paymentAttemptMatchesCatalogMutation(row, { productIds: ["prod_1"] }),
      true,
    );
    assert.equal(
      paymentAttemptMatchesCatalogMutation(row, { variantIds: ["variant_9"] }),
      false,
    );
  });

  it("computeNextQuoteVersionForFingerprintPatch bumps when fingerprint changes", () => {
    assert.equal(
      computeNextQuoteVersionForFingerprintPatch("a", "b", 2),
      3,
    );
    assert.equal(
      computeNextQuoteVersionForFingerprintPatch("a", "a", 5),
      undefined,
    );
    assert.equal(
      computeNextQuoteVersionForFingerprintPatch(null, "x", null),
      2,
    );
  });
});
