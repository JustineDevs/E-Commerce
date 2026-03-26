import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { correlatedJson } from "./staff-api-response";

describe("correlatedJson", () => {
  it("sets x-request-id header", async () => {
    const res = correlatedJson("req-abc", { ok: true });
    assert.equal(res.headers.get("x-request-id"), "req-abc");
    const body = await res.json();
    assert.deepEqual(body, { ok: true });
  });
});
