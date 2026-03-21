/**
 * Medusa process boot validation (Zod). Imported from medusa-config after loadEnv.
 */
import { z } from "zod";

const devOk = z.string().min(1);

function productionStripeSchema() {
  return z
    .object({
      STRIPE_API_KEY: z.string().optional(),
      STRIPE_WEBHOOK_SECRET: z.string().optional(),
    })
    .refine(
      (d) => {
        if (!d.STRIPE_API_KEY?.trim()) return true;
        return Boolean(d.STRIPE_WEBHOOK_SECRET?.trim());
      },
      {
        message:
          "STRIPE_WEBHOOK_SECRET is required in production when STRIPE_API_KEY is set",
      },
    );
}

function productionPaymongoSchema() {
  return z
    .object({
      PAYMONGO_SECRET_KEY: z.string().optional(),
      PAYMONGO_WEBHOOK_SECRET: z.string().optional(),
    })
    .refine(
      (d) => {
        if (!d.PAYMONGO_SECRET_KEY?.trim()) return true;
        return Boolean(d.PAYMONGO_WEBHOOK_SECRET?.trim());
      },
      {
        message:
          "PAYMONGO_WEBHOOK_SECRET is required in production when PAYMONGO_SECRET_KEY is set",
      },
    );
}

export function validateMedusaProcessEnv(): void {
  const db = z.object({
    DATABASE_URL: devOk,
  });
  const r = db.safeParse(process.env);
  if (!r.success) {
    throw new Error(
      `Medusa: DATABASE_URL is required — ${r.error.message}`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    const jwt = process.env.JWT_SECRET?.trim() ?? "";
    const cookie = process.env.COOKIE_SECRET?.trim() ?? "";
    if (jwt === "supersecret" || cookie === "supersecret") {
      throw new Error(
        "Medusa: JWT_SECRET and COOKIE_SECRET must not use default 'supersecret' in production",
      );
    }
    if (!jwt.length || !cookie.length) {
      throw new Error(
        "Medusa: JWT_SECRET and COOKIE_SECRET are required in production",
      );
    }

    const storeCors = process.env.STORE_CORS?.trim() ?? "";
    const adminCors = process.env.ADMIN_CORS?.trim() ?? "";
    const authCors = process.env.AUTH_CORS?.trim() ?? "";
    if (!storeCors || !adminCors || !authCors) {
      const missing: string[] = [];
      if (!storeCors) missing.push("STORE_CORS");
      if (!adminCors) missing.push("ADMIN_CORS");
      if (!authCors) missing.push("AUTH_CORS");
      throw new Error(
        `Medusa: required CORS env in production: ${missing.join(", ")}`,
      );
    }

    const stripe = productionStripeSchema().safeParse(process.env);
    if (!stripe.success) {
      throw new Error(
        `Medusa: ${stripe.error.issues[0]?.message ?? "Stripe env invalid"}`,
      );
    }

    const paymongo = productionPaymongoSchema().safeParse(process.env);
    if (!paymongo.success) {
      throw new Error(
        `Medusa: ${paymongo.error.issues[0]?.message ?? "Paymongo env invalid"}`,
      );
    }
  }
}
