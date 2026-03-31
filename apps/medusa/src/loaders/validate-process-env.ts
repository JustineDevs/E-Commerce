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

function productionMayaSchema() {
  return z
    .object({
      MAYA_SECRET_KEY: z.string().optional(),
      MAYA_WEBHOOK_SECRET: z.string().optional(),
    })
    .refine(
      (d) => {
        if (!d.MAYA_SECRET_KEY?.trim()) return true;
        return Boolean(d.MAYA_WEBHOOK_SECRET?.trim());
      },
      {
        message:
          "MAYA_WEBHOOK_SECRET is required in production when MAYA_SECRET_KEY is set",
      },
    );
}

function productionPayPalSchema() {
  return z
    .object({
      PAYPAL_CLIENT_ID: z.string().optional(),
      PAYPAL_CLIENT_SECRET: z.string().optional(),
      PAYPAL_WEBHOOK_ID: z.string().optional(),
    })
    .refine(
      (d) => {
        if (!d.PAYPAL_CLIENT_ID?.trim()) return true;
        return Boolean(d.PAYPAL_CLIENT_SECRET?.trim());
      },
      {
        message:
          "PAYPAL_CLIENT_SECRET is required in production when PAYPAL_CLIENT_ID is set",
      },
    )
    .refine(
      (d) => {
        if (!d.PAYPAL_CLIENT_ID?.trim()) return true;
        return Boolean(d.PAYPAL_WEBHOOK_ID?.trim());
      },
      {
        message:
          "PAYPAL_WEBHOOK_ID is required in production when PAYPAL_CLIENT_ID is set (webhook signature verification)",
      },
    );
}

function warnPartialOptionalProvider(
  name: string,
  keys: string[],
  env: Record<string, string | undefined>,
): void {
  const set = keys.filter((k) => Boolean(env[k]?.trim()));
  if (set.length > 0 && set.length < keys.length) {
    const missing = keys.filter((k) => !env[k]?.trim());
    console.warn(
      `[env] ${name}: partially configured (set: ${set.join(", ")}; missing: ${missing.join(", ")}). Feature may not work.`,
    );
  }
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

  const credSrc = process.env.PAYMENT_CREDENTIALS_SOURCE?.trim().toLowerCase();

  if (process.env.NODE_ENV === "production") {
    const mandateOff = process.env.MEDUSA_BYOK_MANDATE_OFF?.trim() === "1";
    if (!mandateOff) {
      if (credSrc !== "platform" && credSrc !== "supabase") {
        throw new Error(
          "Medusa: production requires PAYMENT_CREDENTIALS_SOURCE=platform or supabase (BYOK via Supabase payment_connections). " +
            "Remove plaintext PSP keys from deployment env when using platform source. " +
            "Break-glass only: MEDUSA_BYOK_MANDATE_OFF=1.",
        );
      }
    }
  }

  if (credSrc === "platform" || credSrc === "supabase") {
    const need = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "PAYMENT_CONNECTIONS_ENCRYPTION_KEY",
    ] as const;
    const missing = need.filter((k) => !process.env[k]?.trim());
    if (missing.length > 0) {
      throw new Error(
        `Medusa: PAYMENT_CREDENTIALS_SOURCE=platform requires ${missing.join(", ")}`,
      );
    }
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

    const paypal = productionPayPalSchema().safeParse(process.env);
    if (!paypal.success) {
      throw new Error(
        `Medusa: ${paypal.error.issues[0]?.message ?? "PayPal env invalid"}`,
      );
    }

    const maya = productionMayaSchema().safeParse(process.env);
    if (!maya.success) {
      throw new Error(
        `Medusa: ${maya.error.issues[0]?.message ?? "Maya env invalid"}`,
      );
    }
  }

  const resendKeys = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"];
  warnPartialOptionalProvider("Resend", resendKeys, process.env as Record<string, string | undefined>);
  if (
    resendKeys.every((k) => process.env[k]?.trim()) &&
    !process.env.TRACKING_HMAC_SECRET?.trim()
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Medusa: TRACKING_HMAC_SECRET is required in production when Resend is configured — tracking links would be unsigned without it",
      );
    }
    console.warn(
      "[env] Resend is configured but TRACKING_HMAC_SECRET is not set — order tracking links will be unsigned; set TRACKING_HMAC_SECRET before production",
    );
  }

  warnPartialOptionalProvider("AfterShip", [
    "AFTERSHIP_API_KEY",
  ], process.env as Record<string, string | undefined>);
}
