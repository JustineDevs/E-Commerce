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
    CREATE TABLE IF NOT EXISTS aftership_webhook_dedup (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  tableEnsured = true;
}

export function buildAftershipWebhookDedupId(
  orderId: string,
  tag: string | undefined,
): string {
  return `aftership:${orderId}:${tag ?? "unknown"}`;
}

export async function claimAftershipWebhookDedup(dedupId: string): Promise<boolean> {
  if (!dedupId.length) return true;
  const p = getPool();
  if (!p) {
    console.warn("[aftership-dedup] DATABASE_URL not set — rejecting webhook to prevent duplicate processing");
    return false;
  }
  await ensureTable(p);
  const res = await p.query(
    `INSERT INTO aftership_webhook_dedup (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [dedupId],
  );
  const first = (res.rowCount ?? 0) >= 1;
  if (!first) {
    logWebhookDedupDuplicate("aftership", dedupId);
  }
  return first;
}
