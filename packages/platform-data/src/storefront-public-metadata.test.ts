import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  EMPTY_STOREFRONT_PUBLIC_METADATA,
  mergeStorefrontPublicMetadataPayload,
  resolveStorefrontPublicMetadataWithEnv,
} from "./storefront-public-metadata";

describe("mergeStorefrontPublicMetadataPayload", () => {
  it("returns empty strings for null input", () => {
    const m = mergeStorefrontPublicMetadataPayload(null);
    assert.deepEqual(m, EMPTY_STOREFRONT_PUBLIC_METADATA);
  });

  it("merges partial payload", () => {
    const m = mergeStorefrontPublicMetadataPayload({
      supportEmail: "a@b.co",
    });
    assert.equal(m.supportEmail, "a@b.co");
    assert.equal(m.instagramUrl, "");
  });
});

const ENV_KEYS = [
  "NEXT_PUBLIC_INSTAGRAM_URL",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_SUPPORT_PHONE",
] as const;

describe("resolveStorefrontPublicMetadataWithEnv", () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = {};
    for (const k of ENV_KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it("prefers non-empty CMS over env", () => {
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "env@x.com";
    const r = resolveStorefrontPublicMetadataWithEnv({
      ...EMPTY_STOREFRONT_PUBLIC_METADATA,
      supportEmail: "cms@x.com",
    });
    assert.equal(r.supportEmail, "cms@x.com");
  });

  it("falls back to env when CMS empty", () => {
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "env@x.com";
    const r = resolveStorefrontPublicMetadataWithEnv(EMPTY_STOREFRONT_PUBLIC_METADATA);
    assert.equal(r.supportEmail, "env@x.com");
  });
});
