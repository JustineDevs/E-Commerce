import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  listStalePaymentAttempts,
  listStuckPaymentAttempts,
} from "./payment-ledger.js";

describe("payment-ledger list aliases", () => {
  it("listStalePaymentAttempts aliases listStuckPaymentAttempts", () => {
    assert.equal(listStalePaymentAttempts, listStuckPaymentAttempts);
  });
});
