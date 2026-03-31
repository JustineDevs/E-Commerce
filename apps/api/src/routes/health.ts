import { Router } from "express";
import { createSupabaseClient } from "@apparel-commerce/database";
import { getMedusaStoreBaseUrl } from "@apparel-commerce/sdk";

export const healthRouter: ReturnType<typeof Router> = Router();

function getMedusaBaseUrl(): string {
  return getMedusaStoreBaseUrl();
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

  res.status(200).json({
    status,
    medusa: medusa.ok ? "ok" : "unavailable",
    supabase: supabaseOk ? "ok" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/ready", async (_req, res) => {
  const [medusa, supabaseOk] = await Promise.all([
    checkMedusa(),
    checkSupabase(),
  ]);

  const allOk = medusa.ok && supabaseOk;
  const httpStatus = allOk ? 200 : 503;

  res.status(httpStatus).json({
    ready: allOk,
    medusa: medusa.ok ? "ok" : "unavailable",
    supabase: supabaseOk ? "ok" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});
