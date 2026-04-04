import pg from "pg";

import { logWebhookDedupDuplicate } from "./webhook-dedup-metrics";

let pool: pg.Pool | null = null;
let tableEnsured = false;

function getPool(): pg.Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) pool = new pg.Pool({ connectionString: url, max: 3 });
  return pool;
}

async function ensureTable(p: pg.Pool): Promise<void> {
  if (tableEnsured) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS paymongo_webhook_dedup (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  tableEnsured = true;
}

export function buildPaymongoWebhookDedupId(body: Record<string, unknown>): string | null {
  const data = body.data as { id?: string; attributes?: { type?: string } } | undefined;
  if (!data?.id) return null;
  const eventType = data.attributes?.type ?? "unknown";
  return `paymongo:${eventType}:${data.id}`;
}

export async function claimPaymongoWebhookDedup(dedupId: string): Promise<boolean> {
  if (!dedupId.length) return true;
  const p = getPool();
  if (!p) {
    console.warn("[paymongo-dedup] DATABASE_URL not set — rejecting webhook to prevent duplicate processing");
    return false;
  }
  await ensureTable(p);
  const res = await p.query(
    `INSERT INTO paymongo_webhook_dedup (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [dedupId],
  );
  const first = (res.rowCount ?? 0) >= 1;
  if (!first) {
    logWebhookDedupDuplicate("paymongo", dedupId);
  }
  return first;
}
