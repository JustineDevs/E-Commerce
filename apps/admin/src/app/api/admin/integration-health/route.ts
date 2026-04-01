import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { staffSessionAllows } from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";

export type IntegrationHealthEntry = {
  provider: string;
  status: "healthy" | "degraded" | "down" | "unconfigured";
  sdkVersion: string | null;
  lastWebhookAt: string | null;
  webhookStatus: "unknown" | "healthy" | "failing";
  envPresent: boolean;
  note: string;
};

const PROVIDER_ENV_KEYS: Record<string, string[]> = {
  stripe: ["STRIPE_API_KEY"],
  paypal: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
  paymongo: ["PAYMONGO_SECRET_KEY"],
  maya: ["MAYA_SECRET_KEY"],
  aftership: ["AFTERSHIP_API_KEY"],
};

const SDK_VERSIONS: Record<string, string> = {
  stripe: "stripe (Checkout Session provider in apps/medusa/src/modules/stripe-checkout-payment)",
  paypal: "@paypal/paypal-server-sdk",
  paymongo: "typed REST wrapper (no official Node SDK)",
  maya: "typed REST wrapper (no official Node SDK)",
  aftership: "@aftership/tracking-sdk",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "settings:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries: IntegrationHealthEntry[] = Object.keys(PROVIDER_ENV_KEYS).map(
    (provider) => {
      const envKeys = PROVIDER_ENV_KEYS[provider] ?? [];
      const envPresent = envKeys.every(
        (k) => typeof process.env[k] === "string" && process.env[k]!.trim() !== "",
      );

      const status: IntegrationHealthEntry["status"] = envPresent
        ? "healthy"
        : "unconfigured";
      const note = envPresent
        ? "Env keys present for this app process (Medusa may use its own env)."
        : `Missing env: ${envKeys.join(", ")}`;

      return {
        provider,
        status,
        sdkVersion: SDK_VERSIONS[provider] ?? null,
        lastWebhookAt: null,
        webhookStatus: "unknown" as const,
        envPresent,
        note,
      };
    },
  );

  return NextResponse.json({ entries });
}
