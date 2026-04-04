/**
 * AfterShip tag mapping unit tests. `.mts` keeps ESM resolution for sibling `.ts` on Windows.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mapAftershipTag } from "./aftership-status-map.ts";

test("mapAftershipTag: delivered", () => {
  assert.equal(mapAftershipTag("Delivered"), "delivered");
});

test("mapAftershipTag: normalizes spacing", () => {
  assert.equal(mapAftershipTag("Out For Delivery"), "out_for_delivery");
  assert.equal(mapAftershipTag("in_transit"), "in_transit");
});

test("mapAftershipTag: unknown defaults to in_transit", () => {
  assert.equal(mapAftershipTag("CustomTag"), "in_transit");
});
