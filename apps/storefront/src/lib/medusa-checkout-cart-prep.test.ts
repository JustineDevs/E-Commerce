import assert from "node:assert/strict";
import test from "node:test";

import {
  cartToTotalsPreview,
  reconcileMedusaCartGrandTotalMajor,
} from "./medusa-checkout-cart-prep";

test("reconcileMedusaCartGrandTotalMajor uses component totals when cart total is low", () => {
  const reconciled = reconcileMedusaCartGrandTotalMajor(
    {
      subtotal: 10_000,
      shipping_total: 500,
      tax_total: 1_200,
      discount_total: 0,
      total: 10_000,
    },
    "php",
  );

  assert.deepEqual(reconciled, { totalMajor: 117, reconciled: true });
});

test("cartToTotalsPreview aggregates repeated variants and unit-price fallbacks", () => {
  const preview = cartToTotalsPreview({
    currency_code: "php",
    subtotal: 19_000,
    tax_total: 2_280,
    shipping_total: 500,
    discount_total: 1_000,
    total: 20_780,
    region_id: "reg_1",
    items: [
      {
        variant_id: "variant_2",
        product_id: "prod_2",
        subtotal: 12_000,
        quantity: 2,
      },
      {
        variant_id: "variant_1",
        quantity: 2,
        unit_price: 3_000,
        variant: { product_id: "prod_1" },
      },
      {
        variant_id: "variant_1",
        quantity: 1,
        subtotal: 1_000,
        variant: { product_id: "prod_1" },
      },
    ],
    shipping_methods: [{ shipping_option_id: "ship_standard" }],
  });

  assert.equal(preview.currencyCode, "PHP");
  assert.equal(preview.total, 207.8);
  assert.deepEqual(preview.lineSubtotalsByVariantId, {
    variant_1: 70,
    variant_2: 120,
  });
  assert.deepEqual(preview.productIds, ["prod_1", "prod_2"]);
  assert.deepEqual(preview.variantIds, ["variant_1", "variant_2"]);
  assert.deepEqual(preview.shippingMethodIds, ["ship_standard"]);
});
