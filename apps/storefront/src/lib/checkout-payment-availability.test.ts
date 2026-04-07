import assert from "node:assert/strict";
import test from "node:test";

import { resolveCheckoutPaymentAvailability } from "./checkout-payment-availability";

test("resolveCheckoutPaymentAvailability: region keys drive availability (provider removed from region)", () => {
  const { available, source } = resolveCheckoutPaymentAvailability(["STRIPE", "COD"]);
  assert.equal(source, "medusa");
  assert.equal(available.STRIPE, true);
  assert.equal(available.COD, true);
  assert.equal(available.PAYPAL, false);
});

test("resolveCheckoutPaymentAvailability: empty region falls back to env-style list", () => {
  const { source } = resolveCheckoutPaymentAvailability([]);
  assert.equal(source, "env");
});
