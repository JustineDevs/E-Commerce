import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  decryptJsonEnvelope,
  encryptJsonEnvelope,
  encryptJsonV1Direct,
} from "./index.ts";

describe("payment-connection-crypto", () => {
  const prevKey = process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY;
  const prevKms = process.env.PAYMENT_CONNECTIONS_KMS_KEY_ID;

  beforeEach(() => {
    process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    delete process.env.PAYMENT_CONNECTIONS_KMS_KEY_ID;
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY;
    else process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY = prevKey;
    if (prevKms === undefined) delete process.env.PAYMENT_CONNECTIONS_KMS_KEY_ID;
    else process.env.PAYMENT_CONNECTIONS_KMS_KEY_ID = prevKms;
  });

  test("v1 direct roundtrip", async () => {
    const payload = { provider: "stripe", secretKey: "sk_test_1234" };
    const ct = encryptJsonV1Direct(payload);
    const out = await decryptJsonEnvelope(ct);
    assert.deepEqual(out, payload);
  });

  test("local kek envelope roundtrip when KMS unset", async () => {
    const payload = { provider: "stripe", secretKey: "sk_test_abcd" };
    const enc = await encryptJsonEnvelope(payload);
    assert.equal(enc.scheme, "local-kek-envelope");
    const out = await decryptJsonEnvelope(enc.ciphertext);
    assert.deepEqual(out, payload);
  });
});
