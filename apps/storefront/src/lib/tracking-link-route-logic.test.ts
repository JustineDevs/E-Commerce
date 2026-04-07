import assert from "node:assert/strict";
import test from "node:test";

import { trackingLinkRouteLogic } from "./tracking-link-route-logic";

test("trackingLinkRouteLogic rejects invalid ids", () => {
  const result = trackingLinkRouteLogic({
    cartId: "bad",
    rateLimited: false,
    buildTrackingUrl: () => "/track/bad",
  });

  assert.equal(result.status, 400);
});

test("trackingLinkRouteLogic returns 429 when rate limited", () => {
  const result = trackingLinkRouteLogic({
    cartId: "cart_123",
    rateLimited: true,
    retryAfterSec: 7,
    buildTrackingUrl: () => "/track/cart_123",
  });

  assert.equal(result.status, 429);
  assert.equal(result.body.retryAfter, 7);
});

test("trackingLinkRouteLogic returns 503 when signed tracking is unavailable", () => {
  const result = trackingLinkRouteLogic({
    cartId: "order_123",
    rateLimited: false,
    buildTrackingUrl: () => null,
  });

  assert.equal(result.status, 503);
});

test("trackingLinkRouteLogic returns signed tracking url for carts and orders", () => {
  const cartResult = trackingLinkRouteLogic({
    cartId: "cart_123",
    rateLimited: false,
    buildTrackingUrl: (id) => `/track/${id}?t=signed`,
  });
  const orderResult = trackingLinkRouteLogic({
    cartId: "order_123",
    rateLimited: false,
    buildTrackingUrl: (id) => `/track/${id}?t=signed`,
  });

  assert.equal(cartResult.status, 200);
  assert.equal(cartResult.body.trackingPageUrl, "/track/cart_123?t=signed");
  assert.equal(orderResult.status, 200);
  assert.equal(orderResult.body.trackingPageUrl, "/track/order_123?t=signed");
});
