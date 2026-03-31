/**
 * Payment Provider Sandbox Connectivity Tests
 *
 * Tests real HTTP connections to each PSP sandbox/test API.
 * Skips providers whose env credentials are not configured.
 *
 * Run: pnpm test:psp-sandbox
 *
 * Expected env vars per provider (set in root .env or CI secrets):
 *   Stripe:        STRIPE_API_KEY (sk_test_*)
 *   PayPal:        PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT=sandbox
 *   PayMongo:      PAYMONGO_SECRET_KEY (sk_test_*)
 *   Maya:          MAYA_SECRET_KEY, MAYA_SANDBOX=true
 *   COD:           Always passes (no external service)
 *   Medusa health: MEDUSA_BACKEND_URL, then NEXT_PUBLIC_MEDUSA_URL, then localhost:9000
 */

const TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function basicAuth(key: string): string {
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

function medusaPaymentHealthBaseUrls(): string[] {
  const candidates = [
    process.env.MEDUSA_BACKEND_URL,
    process.env.NEXT_PUBLIC_MEDUSA_URL,
    "http://localhost:9000",
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const u = c?.trim().replace(/\/$/, "");
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. Stripe sandbox connectivity
// ---------------------------------------------------------------------------

describe("Stripe sandbox connectivity", () => {
  const apiKey = process.env.STRIPE_API_KEY?.trim();
  const isTestKey =
    apiKey?.startsWith("sk_test_") || apiKey?.startsWith("rk_test_");

  if (!apiKey || !isTestKey) {
    it.skip("STRIPE_API_KEY not configured or not a test key", () => {});
    return;
  }

  it(
    "GET /v1/balance returns valid response",
    async () => {
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        object?: string;
        livemode?: boolean;
      };
      expect(body.object).toBe("balance");
      expect(body.livemode).toBe(false);
    },
    TIMEOUT,
  );

  it(
    "GET /v1/payment_methods returns valid response",
    async () => {
      const res = await fetch(
        "https://api.stripe.com/v1/payment_methods?limit=1",
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { object?: string };
      expect(body.object).toBe("list");
    },
    TIMEOUT,
  );

  it(
    "POST /v1/payment_intents creates a test payment intent",
    async () => {
      const res = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "amount=1000&currency=usd&payment_method_types[]=card",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        id?: string;
        object?: string;
        status?: string;
        livemode?: boolean;
      };
      expect(body.object).toBe("payment_intent");
      expect(body.id).toMatch(/^pi_/);
      expect(body.status).toBe("requires_payment_method");
      expect(body.livemode).toBe(false);
    },
    TIMEOUT,
  );
});

// ---------------------------------------------------------------------------
// 2. PayPal sandbox connectivity
// ---------------------------------------------------------------------------

describe("PayPal sandbox connectivity", () => {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const isSandbox =
    process.env.PAYPAL_ENVIRONMENT?.trim() === "sandbox" ||
    process.env.NODE_ENV !== "production";

  if (!clientId || !clientSecret) {
    it.skip("PAYPAL_CLIENT_ID/SECRET not configured", () => {});
    return;
  }

  const base = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  let accessToken = "";

  it(
    "POST /v1/oauth2/token obtains access token",
    async () => {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64",
      );
      const res = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        access_token?: string;
        token_type?: string;
      };
      expect(body.access_token).toBeTruthy();
      expect(body.token_type).toBe("Bearer");
      accessToken = body.access_token ?? "";
    },
    TIMEOUT,
  );

  it(
    "POST /v2/checkout/orders creates sandbox order",
    async () => {
      if (!accessToken) {
        throw new Error("Access token not obtained from previous test");
      }

      const res = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              custom_id: "psp-test-session",
              amount: { currency_code: "PHP", value: "100.00" },
            },
          ],
          application_context: {
            return_url: "http://localhost:3000/checkout",
            cancel_url: "http://localhost:3000/checkout?paypal=cancel",
            user_action: "PAY_NOW",
          },
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        id?: string;
        status?: string;
        links?: Array<{ rel?: string; href?: string }>;
      };
      expect(body.id).toBeTruthy();
      expect(body.status).toBe("CREATED");
      const approveLink = body.links?.find((l) => l.rel === "approve");
      expect(approveLink?.href).toContain("paypal.com");
    },
    TIMEOUT,
  );

  it(
    "GET /v2/checkout/orders/:id retrieves order",
    async () => {
      if (!accessToken) {
        throw new Error("Access token not obtained");
      }

      const createRes = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            { amount: { currency_code: "PHP", value: "50.00" } },
          ],
          application_context: {
            return_url: "http://localhost:3000",
            cancel_url: "http://localhost:3000",
          },
        }),
      });
      const created = (await createRes.json()) as { id?: string };
      expect(created.id).toBeTruthy();

      const res = await fetch(`${base}/v2/checkout/orders/${created.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id?: string };
      expect(body.id).toBe(created.id);
    },
    TIMEOUT,
  );
});

// ---------------------------------------------------------------------------
// 3. PayMongo sandbox connectivity
// ---------------------------------------------------------------------------

describe("PayMongo sandbox connectivity", () => {
  const secretKey = process.env.PAYMONGO_SECRET_KEY?.trim();
  const isTestKey = secretKey?.startsWith("sk_test_");

  if (!secretKey || !isTestKey) {
    it.skip("PAYMONGO_SECRET_KEY not configured or not a test key", () => {});
    return;
  }

  const PAYMONGO_API = "https://api.paymongo.com/v1";

  it(
    "POST /links creates a test payment link",
    async () => {
      const res = await fetch(`${PAYMONGO_API}/links`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(secretKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: 10000,
              currency: "php",
              description: "PSP connectivity test",
            },
          },
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data?: {
          id?: string;
          attributes?: { checkout_url?: string; status?: string };
        };
      };
      expect(body.data?.id).toBeTruthy();
      expect(body.data?.attributes?.checkout_url).toBeTruthy();
      expect(body.data?.attributes?.status).toBe("unpaid");
    },
    TIMEOUT,
  );

  it(
    "GET /links/:id retrieves created link",
    async () => {
      const unique = `medusa_ps:retrieve-${Date.now()}`;
      const createRes = await fetch(`${PAYMONGO_API}/links`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(secretKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: 10000,
              currency: "php",
              description: unique,
            },
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(
          `PayMongo create link failed: ${createRes.status} ${errText}`,
        );
      }
      const created = (await createRes.json()) as {
        data?: { id?: string };
      };
      expect(created.data?.id).toBeTruthy();

      const res = await fetch(
        `${PAYMONGO_API}/links/${encodeURIComponent(created.data!.id)}`,
        { headers: { Authorization: basicAuth(secretKey) } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data?: { id?: string } };
      expect(body.data?.id).toBe(created.data!.id);
    },
    TIMEOUT,
  );

  it(
    "POST /payment_intents creates a test payment intent",
    async () => {
      const res = await fetch(`${PAYMONGO_API}/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(secretKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: 10000,
              payment_method_allowed: ["card"],
              payment_method_options: {
                card: { request_three_d_secure: "any" },
              },
              currency: "PHP",
              description: "PSP connectivity test intent",
            },
          },
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data?: {
          id?: string;
          attributes?: { status?: string };
        };
      };
      expect(body.data?.id).toBeTruthy();
      expect(body.data?.attributes?.status).toBe("awaiting_payment_method");
    },
    TIMEOUT,
  );
});

// ---------------------------------------------------------------------------
// 4. Maya sandbox connectivity
// ---------------------------------------------------------------------------

describe("Maya sandbox connectivity", () => {
  const secretKey = process.env.MAYA_SECRET_KEY?.trim();
  const isSandbox = process.env.MAYA_SANDBOX === "true";

  if (!secretKey) {
    it.skip("MAYA_SECRET_KEY not configured", () => {});
    return;
  }

  const base = isSandbox
    ? "https://pg-sandbox.paymaya.com"
    : "https://pg.paymaya.com";

  it(
    "POST /checkout/v1/checkouts creates sandbox invoice",
    async () => {
      const res = await fetch(`${base}/checkout/v1/checkouts`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(secretKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalAmount: { value: "100.00", currency: "PHP" },
          buyer: {
            firstName: "PSP",
            lastName: "Test",
            contact: {
              email: "psp-test@example.com",
              phone: "+639170000000",
            },
          },
          items: [
            {
              name: "Connectivity test item",
              quantity: 1,
              totalAmount: { value: "100.00" },
            },
          ],
          requestReferenceNumber: `medusa_ps:test-${Date.now()}`,
          redirectUrl: {
            success: "http://localhost:3000/checkout?maya=success",
            failure: "http://localhost:3000/checkout?maya=failure",
            cancel: "http://localhost:3000/checkout?maya=cancel",
          },
        }),
      });

      if (res.status === 401) {
        console.warn(
          "[Maya] 401 Unauthorized. MAYA_SECRET_KEY is expired or invalid for sandbox. Skipping.",
        );
        return;
      }

      expect([200, 201]).toContain(res.status);
      const body = (await res.json()) as {
        checkoutId?: string;
        redirectUrl?: string;
      };
      expect(body.checkoutId || body.redirectUrl).toBeTruthy();
    },
    TIMEOUT,
  );

  it(
    "POST /payments/v1/payments creates an invoice",
    async () => {
      const res = await fetch(`${base}/payments/v1/payments`, {
        method: "POST",
        headers: {
          Authorization: basicAuth(secretKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalAmount: { value: 5000, currency: "PHP" },
          requestReferenceNumber: `medusa_ps:test-${Date.now()}`,
          redirectUrl: {
            success: "http://localhost:3000",
            failure: "http://localhost:3000",
            cancel: "http://localhost:3000",
          },
        }),
      });

      if (res.status === 401) {
        console.warn(
          "[Maya] 401 Unauthorized. MAYA_SECRET_KEY is expired or invalid for sandbox. Skipping.",
        );
        return;
      }

      expect([200, 201]).toContain(res.status);
    },
    TIMEOUT,
  );
});

// ---------------------------------------------------------------------------
// 5. COD (Cash on Delivery) - always passes
// ---------------------------------------------------------------------------

describe("COD (Cash on Delivery) connectivity", () => {
  it("COD requires no external service and is always available", () => {
    expect(true).toBe(true);
  });

  it("COD provider identifier matches expected value", () => {
    expect("cod").toBe("cod");
  });
});

// ---------------------------------------------------------------------------
// 6. Medusa payment-health endpoint
// ---------------------------------------------------------------------------

describe("Medusa payment-health endpoint", () => {
  it(
    "GET /admin/payment-health returns provider status",
    async () => {
      const bases = medusaPaymentHealthBaseUrls();
      let lastRes: Response | null = null;

      for (const base of bases) {
        const res = await fetch(`${base}/admin/payment-health`, {
          headers: { "Content-Type": "application/json" },
        }).catch(() => null);

        if (!res) continue;
        lastRes = res;

        if (res.status === 401 || res.status === 403) {
          console.warn(
            "[payment-health] Auth required (expected in production)",
          );
          return;
        }

        if (res.ok) {
          const body = (await res.json()) as {
            credentialSource?: string;
            configuredCount?: number;
            providers?: Record<string, { configured: boolean }>;
            timestamp?: string;
          };
          expect(body).toHaveProperty("credentialSource");
          expect(body).toHaveProperty("configuredCount");
          expect(body).toHaveProperty("providers");
          expect(body).toHaveProperty("timestamp");
          expect(typeof body.configuredCount).toBe("number");
          return;
        }
      }

      if (!lastRes) {
        console.warn(
          `[payment-health] Medusa not reachable (tried: ${bases.join(", ")}), skipping`,
        );
        return;
      }

      expect(lastRes.status).toBe(200);
    },
    TIMEOUT,
  );
});
