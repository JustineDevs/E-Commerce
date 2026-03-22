import { Router } from "express";
import { createSupabaseClient } from "@apparel-commerce/database";

export const healthRouter: ReturnType<typeof Router> = Router();

function getMedusaBaseUrl(): string {
  const url =
    process.env.MEDUSA_BACKEND_URL ??
    process.env.NEXT_PUBLIC_MEDUSA_URL ??
    "http://localhost:9000";
  return url.replace(/\/$/, "");
}

async function checkMedusa(): Promise<{ url: string; ok: boolean }> {
  const base = getMedusaBaseUrl();
  try {
    const r = await fetch(`${base}/health`);
    return { url: base, ok: r.ok };
  } catch {
    return { url: base, ok: false };
  }
}

async function checkSupabase(): Promise<boolean> {
  try {
    const sb = createSupabaseClient();
    const { error } = await sb.from("users").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

healthRouter.get("/commerce", async (_req, res) => {
  const medusa = await checkMedusa();
  res.json({
    commerceEngine: "medusa",
    medusa: { url: medusa.url, status: medusa.ok ? "ok" : "unreachable" },
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/", async (_req, res) => {
  const [medusa, supabaseOk] = await Promise.all([
    checkMedusa(),
    checkSupabase(),
  ]);

  const allOk = medusa.ok && supabaseOk;
  const status = allOk ? "ok" : "degraded";
  const code = allOk ? 200 : 503;

  res.status(code).json({
    status,
    medusa: medusa.ok ? "ok" : "unavailable",
    supabase: supabaseOk ? "ok" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});
