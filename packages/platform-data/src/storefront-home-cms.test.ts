import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_STOREFRONT_HOME_PAYLOAD,
  mergeStorefrontHomePayload,
} from "./storefront-home-cms";

describe("mergeStorefrontHomePayload", () => {
  it("returns defaults for empty input", () => {
    const m = mergeStorefrontHomePayload(null);
    assert.equal(m.hero.line1, DEFAULT_STOREFRONT_HOME_PAYLOAD.hero.line1);
    assert.equal(m.tiles[0].title, DEFAULT_STOREFRONT_HOME_PAYLOAD.tiles[0].title);
  });

  it("merges partial hero and tiles", () => {
    const m = mergeStorefrontHomePayload({
      hero: { line1: "CUSTOM" },
      tiles: [{ title: "A" }, { href: "/x" }],
    });
    assert.equal(m.hero.line1, "CUSTOM");
    assert.equal(m.hero.line2, DEFAULT_STOREFRONT_HOME_PAYLOAD.hero.line2);
    assert.equal(m.tiles[0].title, "A");
    assert.equal(m.tiles[1].href, "/x");
    assert.equal(m.tiles[2].title, DEFAULT_STOREFRONT_HOME_PAYLOAD.tiles[2].title);
  });
});
