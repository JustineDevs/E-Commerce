/**
 * Stress test: Medusa process env validation with mock data.
 * Run: pnpm --filter medusa test:stress
 */
import assert from "node:assert/strict";
import test from "node:test";
import { validateMedusaProcessEnv } from "./validate-process-env.js";

const envBackup = { ...process.env };

function restoreEnv() {
  Object.keys(process.env).forEach((k) => delete process.env[k]);
  Object.assign(process.env, envBackup);
}

test.afterEach(restoreEnv);

test("validateMedusaProcessEnv: throws when DATABASE_URL missing", () => {
  process.env.DATABASE_URL = "";
  assert.throws(
    () => validateMedusaProcessEnv(),
    /DATABASE_URL is required/,
  );
});

test("validateMedusaProcessEnv: passes in development with DATABASE_URL", () => {
  process.env.NODE_ENV = "development";
  process.env.DATABASE_URL = "postgres://local:5432/test";
  assert.doesNotThrow(() => validateMedusaProcessEnv());
});

const prodCors = () => {
  process.env.STORE_CORS = "https://store.example.com";
  process.env.ADMIN_CORS = "https://admin.example.com";
  process.env.AUTH_CORS = "https://admin.example.com";
};

test("validateMedusaProcessEnv: throws in production when STORE_CORS missing", () => {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "postgres://x";
  process.env.JWT_SECRET = "a";
  process.env.COOKIE_SECRET = "b";
  process.env.ADMIN_CORS = "x";
  process.env.AUTH_CORS = "x";
  assert.throws(
    () => validateMedusaProcessEnv(),
    /STORE_CORS/,
  );
});

test("validateMedusaProcessEnv: throws in production when JWT_SECRET missing", () => {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "postgres://x";
  process.env.JWT_SECRET = "";
  process.env.COOKIE_SECRET = "some-secret";
  prodCors();
  assert.throws(
    () => validateMedusaProcessEnv(),
    /JWT_SECRET.*required/,
  );
});

test("validateMedusaProcessEnv: throws in production when COOKIE_SECRET missing", () => {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "postgres://x";
  process.env.JWT_SECRET = "some-secret";
  process.env.COOKIE_SECRET = "";
  prodCors();
  assert.throws(
    () => validateMedusaProcessEnv(),
    /COOKIE_SECRET.*required/,
  );
});

test("validateMedusaProcessEnv: throws in production when JWT_SECRET is supersecret", () => {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "postgres://x";
  process.env.JWT_SECRET = "supersecret";
  process.env.COOKIE_SECRET = "other";
  prodCors();
  assert.throws(
    () => validateMedusaProcessEnv(),
    /must not use default/,
  );
});

function setupValidProd() {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "postgres://x";
  process.env.JWT_SECRET = "real-secret-1";
  process.env.COOKIE_SECRET = "real-secret-2";
  process.env.STORE_CORS = "https://store.example.com";
  process.env.ADMIN_CORS = "https://admin.example.com";
  process.env.AUTH_CORS = "https://admin.example.com";
}

test("validateMedusaProcessEnv: throws when Lemon API key set without webhook secret", () => {
  setupValidProd();
  process.env.LEMONSQUEEZY_API_KEY = "lsk_live_xxx";
  process.env.LEMONSQUEEZY_STORE_ID = "12345";
  process.env.LEMONSQUEEZY_CHECKOUT_VARIANT_ID = "67890";
  delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  assert.throws(
    () => validateMedusaProcessEnv(),
    /LEMONSQUEEZY_WEBHOOK_SECRET/,
  );
});

test("validateMedusaProcessEnv: passes when all Lemon env vars set", () => {
  setupValidProd();
  process.env.LEMONSQUEEZY_API_KEY = "lsk_live_xxx";
  process.env.LEMONSQUEEZY_STORE_ID = "12345";
  process.env.LEMONSQUEEZY_CHECKOUT_VARIANT_ID = "67890";
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "whsec_xxx";
  assert.doesNotThrow(() => validateMedusaProcessEnv());
});

test("validateMedusaProcessEnv: throws when PayPal client ID set without secret", () => {
  setupValidProd();
  process.env.PAYPAL_CLIENT_ID = "AZDxjDScFpQ";
  delete process.env.PAYPAL_CLIENT_SECRET;
  assert.throws(
    () => validateMedusaProcessEnv(),
    /PAYPAL_CLIENT_SECRET.*required/,
  );
});

test("validateMedusaProcessEnv: passes when PayPal client ID and secret both set", () => {
  setupValidProd();
  process.env.PAYPAL_CLIENT_ID = "AZDxjDScFpQ";
  process.env.PAYPAL_CLIENT_SECRET = "EJp8vlxYBq";
  assert.doesNotThrow(() => validateMedusaProcessEnv());
});

test("validateMedusaProcessEnv: passes when no optional payment providers configured", () => {
  setupValidProd();
  delete process.env.LEMONSQUEEZY_API_KEY;
  delete process.env.PAYPAL_CLIENT_ID;
  delete process.env.STRIPE_API_KEY;
  delete process.env.PAYMONGO_SECRET_KEY;
  assert.doesNotThrow(() => validateMedusaProcessEnv());
});
