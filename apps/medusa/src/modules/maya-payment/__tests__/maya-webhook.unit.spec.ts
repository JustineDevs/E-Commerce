import crypto from "crypto";

function verifyMayaSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

describe("Maya webhook signature verification", () => {
  const secret = "test-maya-webhook-secret-2024";

  it("accepts a valid HMAC signature", () => {
    const body = JSON.stringify({
      id: "inv_001",
      paymentStatus: "PAYMENT_SUCCESS",
      requestReferenceNumber: "medusa_ps:sess_abc123",
    });
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    expect(verifyMayaSignature(body, sig, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ id: "inv_001" });
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    const tampered = JSON.stringify({ id: "inv_002" });
    expect(verifyMayaSignature(tampered, sig, secret)).toBe(false);
  });

  it("rejects an empty signature", () => {
    const body = JSON.stringify({ id: "inv_001" });
    expect(verifyMayaSignature(body, "", secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const body = JSON.stringify({ id: "inv_001" });
    const sig = crypto
      .createHmac("sha256", "wrong-secret")
      .update(body)
      .digest("hex");
    expect(verifyMayaSignature(body, sig, secret)).toBe(false);
  });

  it("rejects a signature with different length", () => {
    const body = JSON.stringify({ id: "inv_001" });
    expect(verifyMayaSignature(body, "abcdef", secret)).toBe(false);
  });
});
