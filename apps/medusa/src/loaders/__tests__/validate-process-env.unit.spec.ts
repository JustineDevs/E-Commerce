import { validateMedusaProcessEnv } from "../validate-process-env";

const PSP_KEYS = [
  "STRIPE_API_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAYMONGO_SECRET_KEY",
  "PAYMONGO_WEBHOOK_SECRET",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "MAYA_SECRET_KEY",
  "MAYA_WEBHOOK_SECRET",
] as const;

function clearPspKeys(): void {
  for (const k of PSP_KEYS) delete process.env[k];
}

function setProductionByokBase(): void {
  clearPspKeys();
  process.env.PAYMENT_CREDENTIALS_SOURCE = "platform";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
  process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY = "a".repeat(64);
}

describe("validateMedusaProcessEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgres://localhost:5432/test",
      NODE_ENV: "development",
    };
    delete process.env.MEDUSA_BYOK_MANDATE_OFF;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("passes with minimal valid env in development", () => {
    expect(() => validateMedusaProcessEnv()).not.toThrow();
  });

  it("throws when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => validateMedusaProcessEnv()).toThrow("DATABASE_URL");
  });

  it("throws when platform source is set but Supabase URL is missing", () => {
    process.env.PAYMENT_CREDENTIALS_SOURCE = "platform";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
    process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY = "a".repeat(64);
    delete process.env.SUPABASE_URL;
    expect(() => validateMedusaProcessEnv()).toThrow("SUPABASE_URL");
  });

  it("throws when JWT_SECRET is 'supersecret' in production", () => {
    process.env.NODE_ENV = "production";
    setProductionByokBase();
    process.env.JWT_SECRET = "supersecret";
    process.env.COOKIE_SECRET = "realsecret";
    expect(() => validateMedusaProcessEnv()).toThrow("supersecret");
  });

  it("throws when CORS env missing in production", () => {
    process.env.NODE_ENV = "production";
    setProductionByokBase();
    process.env.JWT_SECRET = "prod-jwt-secret-value";
    process.env.COOKIE_SECRET = "prod-cookie-secret-value";
    delete process.env.STORE_CORS;
    delete process.env.ADMIN_CORS;
    delete process.env.AUTH_CORS;
    expect(() => validateMedusaProcessEnv()).toThrow("CORS");
  });

  it("throws when Stripe key set but webhook secret missing in production", () => {
    process.env.NODE_ENV = "production";
    setProductionByokBase();
    process.env.JWT_SECRET = "prod-jwt-secret-value";
    process.env.COOKIE_SECRET = "prod-cookie-secret-value";
    process.env.STORE_CORS = "https://store.test";
    process.env.ADMIN_CORS = "https://admin.test";
    process.env.AUTH_CORS = "https://auth.test";
    process.env.STRIPE_API_KEY = "sk_live_test";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => validateMedusaProcessEnv()).toThrow("STRIPE_WEBHOOK_SECRET");
  });

  it("throws when TRACKING_HMAC_SECRET is missing with Resend configured in production", () => {
    process.env.NODE_ENV = "production";
    setProductionByokBase();
    process.env.JWT_SECRET = "prod-jwt-secret-value";
    process.env.COOKIE_SECRET = "prod-cookie-secret-value";
    process.env.STORE_CORS = "https://store.test";
    process.env.ADMIN_CORS = "https://admin.test";
    process.env.AUTH_CORS = "https://auth.test";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "orders@test.com";
    delete process.env.TRACKING_HMAC_SECRET;
    expect(() => validateMedusaProcessEnv()).toThrow("TRACKING_HMAC_SECRET");
  });

  it("throws in production when PAYMENT_CREDENTIALS_SOURCE is not platform or supabase", () => {
    process.env.NODE_ENV = "production";
    clearPspKeys();
    delete process.env.PAYMENT_CREDENTIALS_SOURCE;
    process.env.JWT_SECRET = "prod-jwt-secret-value";
    process.env.COOKIE_SECRET = "prod-cookie-secret-value";
    process.env.STORE_CORS = "https://store.test";
    process.env.ADMIN_CORS = "https://admin.test";
    process.env.AUTH_CORS = "https://auth.test";
    expect(() => validateMedusaProcessEnv()).toThrow("PAYMENT_CREDENTIALS_SOURCE");
  });

  it("allows production file credentials when MEDUSA_BYOK_MANDATE_OFF=1", () => {
    process.env.NODE_ENV = "production";
    clearPspKeys();
    process.env.MEDUSA_BYOK_MANDATE_OFF = "1";
    delete process.env.PAYMENT_CREDENTIALS_SOURCE;
    process.env.JWT_SECRET = "prod-jwt-secret-value";
    process.env.COOKIE_SECRET = "prod-cookie-secret-value";
    process.env.STORE_CORS = "https://store.test";
    process.env.ADMIN_CORS = "https://admin.test";
    process.env.AUTH_CORS = "https://auth.test";
    expect(() => validateMedusaProcessEnv()).not.toThrow();
  });

  it("warns in dev when Resend is configured but TRACKING_HMAC_SECRET missing", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "orders@test.com";
    delete process.env.TRACKING_HMAC_SECRET;
    expect(() => validateMedusaProcessEnv()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("TRACKING_HMAC_SECRET"),
    );
    warnSpy.mockRestore();
  });
});
