import pg from "pg";

let pool: pg.Pool | null = null;
let tableEnsured = false;

function getPool(): pg.Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return null;
  }
  if (!pool) {
    pool = new pg.Pool({ connectionString: url, max: 3 });
  }
  return pool;
}

async function ensureTable(p: pg.Pool): Promise<void> {
  if (tableEnsured) {
    return;
  }
  await p.query(`
    CREATE TABLE IF NOT EXISTS lemon_webhook_dedup (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  tableEnsured = true;
}

/**
 * Stable id for a Lemon webhook delivery (order resource + event name).
 * Same payload retries share the same id.
 */
export function buildLemonWebhookDedupId(body: Record<string, unknown>): string | null {
  const meta = body.meta as { event_name?: string } | undefined;
  const data = body.data as { id?: string } | undefined;
  if (!data?.id) {
    return null;
  }
  return `lemon:${meta?.event_name ?? "unknown"}:${data.id}`;
}

/**
 * @returns true if this id was claimed (first delivery), false if duplicate.
 * When DATABASE_URL is missing (unsupported), returns true (no dedupe).
 */
export async function claimLemonWebhookDedup(dedupId: string): Promise<boolean> {
  if (!dedupId.length) {
    return true;
  }
  const p = getPool();
  if (!p) {
    return true;
  }
  await ensureTable(p);
  const res = await p.query(
    `INSERT INTO lemon_webhook_dedup (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [dedupId],
  );
  return (res.rowCount ?? 0) >= 1;
}
