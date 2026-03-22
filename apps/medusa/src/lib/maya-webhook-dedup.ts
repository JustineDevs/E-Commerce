import pg from "pg";

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
    CREATE TABLE IF NOT EXISTS maya_webhook_dedup (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  tableEnsured = true;
}

export function buildMayaWebhookDedupId(body: Record<string, unknown>): string | null {
  const id = body.id as string | undefined;
  const paymentStatus = body.paymentStatus as string | undefined;
  const checkoutId = (body as { checkoutId?: string }).checkoutId;
  if (!id && !checkoutId) return null;
  const key = id ?? checkoutId ?? "unknown";
  const status = paymentStatus ?? "unknown";
  return `maya:${status}:${key}`;
}

export async function claimMayaWebhookDedup(dedupId: string): Promise<boolean> {
  if (!dedupId.length) return true;
  const p = getPool();
  if (!p) {
    console.warn("[maya-dedup] DATABASE_URL not set — rejecting webhook to prevent duplicate processing");
    return false;
  }
  await ensureTable(p);
  const res = await p.query(
    `INSERT INTO maya_webhook_dedup (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [dedupId],
  );
  return (res.rowCount ?? 0) >= 1;
}
