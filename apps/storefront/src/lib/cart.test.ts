import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCartLines } from "./cart";

test("normalizeCartLines drops malformed rows and normalizes values", () => {
  const lines = normalizeCartLines([
    null,
    { variantId: "   ", quantity: 1 },
    {
      variantId: " variant_1 ",
      quantity: 2.9,
      slug: " shirt ",
      name: " Uniform Shirt ",
      sku: " SKU-1 ",
      size: " M ",
      color: " Black ",
      price: 300,
    },
  ]);

  assert.deepEqual(lines, [
    {
      variantId: "variant_1",
      quantity: 2,
      slug: "shirt",
      name: "Uniform Shirt",
      sku: "SKU-1",
      size: "M",
      color: "Black",
      price: 300,
    },
  ]);
});

test("normalizeCartLines merges duplicate variants into one normalized line", () => {
  const lines = normalizeCartLines([
    {
      variantId: "variant_1",
      quantity: 1,
      slug: "shirt",
      name: "Uniform Shirt",
      sku: "SKU-1",
      size: "M",
      color: "Black",
      price: 100,
    },
    {
      variantId: " variant_1 ",
      quantity: 3,
      slug: "shirt-v2",
      name: "Uniform Shirt 2",
      sku: "SKU-1B",
      size: "L",
      color: "Gray",
      price: 125,
    },
  ]);

  assert.deepEqual(lines, [
    {
      variantId: "variant_1",
      quantity: 4,
      slug: "shirt-v2",
      name: "Uniform Shirt 2",
      sku: "SKU-1B",
      size: "L",
      color: "Gray",
      price: 125,
    },
  ]);
});
