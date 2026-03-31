import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cartMergePostBodySchema,
  cmsFormSubmissionPayloadSchema,
  complianceEmailParamSchema,
  internalCustomerDataErasureBodySchema,
  internalCustomerDataExportBodySchema,
  medusaCartIdSchema,
  medusaResourceIdSchema,
  storefrontProductSlugSchema,
  storefrontReviewPostBodySchema,
  storefrontReviewsListQuerySchema,
} from "./http-schemas";

describe("http-schemas", () => {
  it("accepts Medusa-style resource ids", () => {
    assert.ok(medusaResourceIdSchema.safeParse("prod_01HZABC").success);
    assert.ok(medusaResourceIdSchema.safeParse("variant_01HZ").success);
    assert.ok(!medusaResourceIdSchema.safeParse("nounderscore").success);
    assert.ok(!medusaResourceIdSchema.safeParse("").success);
  });

  it("accepts cart ids", () => {
    assert.ok(medusaCartIdSchema.safeParse("cart_01HZABC").success);
    assert.ok(!medusaCartIdSchema.safeParse("prod_01HZ").success);
    assert.ok(!medusaCartIdSchema.safeParse("cart_").success);
  });

  it("validates compliance email", () => {
    assert.ok(complianceEmailParamSchema.safeParse("a@b.co").success);
    assert.ok(!complianceEmailParamSchema.safeParse("not-an-email").success);
  });

  it("validates cart merge body", () => {
    assert.ok(cartMergePostBodySchema.safeParse({}).success);
    assert.ok(
      cartMergePostBodySchema.safeParse({
        guestLines: [{ variantId: "variant_01ABC", quantity: 2 }],
      }).success,
    );
    assert.ok(
      !cartMergePostBodySchema.safeParse({
        guestLines: [{ variantId: "bad", quantity: 1 }],
      }).success,
    );
  });

  it("validates review list query", () => {
    assert.ok(
      storefrontReviewsListQuerySchema.safeParse({
        productSlug: "tee",
      }).success,
    );
    assert.ok(
      storefrontReviewsListQuerySchema.safeParse({
        medusaProductId: "prod_01HZ",
      }).success,
    );
    assert.ok(!storefrontReviewsListQuerySchema.safeParse({}).success);
  });

  it("validates review post body", () => {
    const ok = storefrontReviewPostBodySchema.safeParse({
      productSlug: "my-product",
      medusaProductId: "prod_01HZABC",
      body: "Great",
      rating: 5,
    });
    assert.ok(ok.success);
    assert.ok(
      !storefrontReviewPostBodySchema.safeParse({
        productSlug: "",
        medusaProductId: "prod_01HZ",
        body: "x",
        rating: 5,
      }).success,
    );
  });

  it("validates product slug", () => {
    assert.ok(storefrontProductSlugSchema.safeParse("some-handle").success);
    assert.ok(!storefrontProductSlugSchema.safeParse("").success);
  });

  it("limits cms form payload size", () => {
    const big: Record<string, string> = {};
    for (let i = 0; i < 201; i++) {
      big[`k${i}`] = "v";
    }
    assert.ok(!cmsFormSubmissionPayloadSchema.safeParse(big).success);
  });

  it("validates internal customer export body", () => {
    assert.ok(
      internalCustomerDataExportBodySchema.safeParse({
        customerId: "cus_01HZ",
        email: "u@example.com",
      }).success,
    );
    assert.ok(
      !internalCustomerDataExportBodySchema.safeParse({
        customerId: "x",
        email: "u@example.com",
      }).success,
    );
  });

  it("validates internal customer erasure body with default retainOrderRecords", () => {
    const r = internalCustomerDataErasureBodySchema.safeParse({
      customerId: "cus_01HZ",
      email: "u@example.com",
      confirmationToken: "tokentoken",
    });
    assert.ok(r.success);
    assert.equal(r.data.retainOrderRecords, false);
  });
});
