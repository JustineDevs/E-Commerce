import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { staffSessionAllows, tryCreateSupabaseClient } from "@apparel-commerce/database";
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
  stripe: "@medusajs/payment-stripe (Medusa built-in)",
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

  const supabase = tryCreateSupabaseClient();
  const { data: connections } = supabase
    ? await supabase
        .from("payment_connections")
        .select("provider, status, webhook_status, last_verified_at, mode")
        .order("provider")
    : { data: null as null };

  const connRows = connections ?? [];

  const entries: IntegrationHealthEntry[] = Object.keys(PROVIDER_ENV_KEYS).map(
    (provider) => {
      const envKeys = PROVIDER_ENV_KEYS[provider] ?? [];
      const envPresent = envKeys.every(
        (k) => typeof process.env[k] === "string" && process.env[k]!.trim() !== "",
      );

      const conn = connRows.find((c) => c.provider === provider);
      const webhookStatus: IntegrationHealthEntry["webhookStatus"] =
        (conn?.webhook_status as IntegrationHealthEntry["webhookStatus"]) ?? "unknown";

      let status: IntegrationHealthEntry["status"] = "unconfigured";
      if (conn) {
        if (conn.status === "enabled" && envPresent) {
          status = webhookStatus === "failing" ? "degraded" : "healthy";
        } else if (conn.status === "disabled") {
          status = "down";
        } else if (conn.status === "sandbox_verified" || conn.status === "draft") {
          status = "degraded";
        } else {
          status = "unconfigured";
        }
      } else if (envPresent) {
        status = "degraded";
      }

      const note =
        status === "unconfigured"
          ? `Missing env: ${envKeys.join(", ")}`
          : status === "degraded" && !conn
            ? "Env present but no BYOK connection record"
            : status === "degraded" && webhookStatus === "failing"
              ? "Webhooks are failing. Check endpoint."
              : status === "healthy"
                ? "Operational"
                : conn?.status === "disabled"
                  ? "Disabled by admin"
                  : "";

      return {
        provider,
        status,
        sdkVersion: SDK_VERSIONS[provider] ?? null,
        lastWebhookAt: conn?.last_verified_at ?? null,
        webhookStatus,
        envPresent,
        note,
      };
    },
  );

  return NextResponse.json({ entries });
}
