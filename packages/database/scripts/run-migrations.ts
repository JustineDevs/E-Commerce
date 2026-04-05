/**
 * Legacy Supabase / platform Postgres migrations (NOT Medusa `DATABASE_URL`).
 *
 * Medusa-style behavior:
 * - Each file in MIGRATION_FILES runs at most once per database.
 * - Applied filenames are recorded in `public.legacy_platform_schema_migrations`.
 * - New database: empty ledger, every file runs in order inside a transaction.
 * - Existing database (first use of this runner): empty ledger, all files run once;
 *   SQL is idempotent (`IF NOT EXISTS`, `DROP IF EXISTS`, etc.) where possible.
 * - Subsequent runs: only pending files run.
 *
 * Append new `supabase/migrations/*.sql` names to MIGRATION_FILES in numeric order.
 * Uses LEGACY_DATABASE_URL from repo root `.env`.
 *
 * Flags:
 *   --status   List applied vs pending and exit (exit 1 if any pending).
 *
 * Supabase CLI alternative: `pnpm --filter @apparel-commerce/database migrate:cli`
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../../.env") });

const MIGRATION_FILES = [
  "002_staff_permissions.sql",
  "003_platform_integrations.sql",
  "004_retail_operations.sql",
  "005_storefront_home_cms.sql",
  "006_cms_platform.sql",
  "007_admin_workflow_operator.sql",
  "008_storefront_reviews_cart.sql",
  "009_medusa_reference_columns.sql",
  "010_pos_offline_commit_idempotency.sql",
  "011_storefront_public_metadata.sql",
  "012_product_reviews_moderation.sql",
  "013_drop_legacy_payment_connections.sql",
  "015_drop_accidental_medusa_core_tables_from_legacy.sql",
  "016_platform_rls_authenticated_denies.sql",
  "018_outbox_events.sql",
  "019_background_jobs.sql",
  "020_storefront_profiles_product_qa.sql",
  "021_cms_content_navigation_expansion.sql",
  "022_cms_sprint_extensions.sql",
  "023_payment_attempts_and_webhook_inbox.sql",
  "024_payment_ops_audit_outbox_job_columns.sql",
  "025_catalog_storage_bucket.sql",
  "enable_rls.sql",
  "rls_deny_anon_sensitive.sql",
] as const;

const MIGRATIONS_TABLE = "legacy_platform_schema_migrations";

const databaseUrl = process.env.LEGACY_DATABASE_URL;
if (!databaseUrl?.trim()) {
  console.error(
    "LEGACY_DATABASE_URL is required (Supabase Postgres pooler URI).",
  );
  console.error(
    "Set it in the repo root .env (see .env.example). Not the same as Medusa DATABASE_URL.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const statusOnly = args.includes("--status");

function switchPoolerPort(url: string, port: number): string {
  try {
    const u = new URL(url);
    u.port = String(port);
    return u.toString();
  } catch {
    return url;
  }
}

async function connectWithPoolerFallback(): Promise<{
  client: pg.Client;
  url: string;
}> {
  const tryConnect = async (url: string) => {
    const client = new pg.Client({
      connectionString: url,
      connectionTimeoutMillis: 20_000,
    });
    await client.connect();
    return client;
  };

  try {
    const client = await tryConnect(databaseUrl!);
    return { client, url: databaseUrl! };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!databaseUrl!.includes("pooler.supabase.com")) {
      throw err;
    }
    const currentPort = new URL(databaseUrl!).port;
    const altPort = currentPort === "5432" ? "6543" : "5432";
    const altUrl = switchPoolerPort(databaseUrl!, Number(altPort));
    console.log(
      `Primary pooler (${currentPort}) failed (${msg}). Trying port ${altPort}...`,
    );
    const client = await tryConnect(altUrl);
    return { client, url: altUrl };
  }
}

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.${MIGRATIONS_TABLE} (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await client.query(`
    COMMENT ON TABLE public.${MIGRATIONS_TABLE} IS
      'Applied platform SQL migrations from packages/database (pnpm migrate). Separate from Medusa mikro_orm_migrations.';
  `);
}

async function getAppliedSet(client: pg.Client): Promise<Set<string>> {
  const { rows } = await client.query<{ filename: string }>(
    `SELECT filename FROM public.${MIGRATIONS_TABLE}`,
  );
  return new Set(rows.map((r) => r.filename));
}

async function printStatusAndExit(
  client: pg.Client,
  applied: Set<string>,
): Promise<never> {
  const defined = new Set<string>(MIGRATION_FILES);
  const pending = MIGRATION_FILES.filter((f) => !applied.has(f));
  const appliedInOrder = MIGRATION_FILES.filter((f) => applied.has(f));
  const orphan = [...applied].filter((f) => !defined.has(f));

  console.log(`Migrations table: public.${MIGRATIONS_TABLE}`);
  console.log(`Total defined in runner: ${MIGRATION_FILES.length}`);
  console.log(`Applied (known files): ${appliedInOrder.length}`);
  if (orphan.length > 0) {
    console.warn(
      `Orphan rows in ledger (not in MIGRATION_FILES; remove manually if stale): ${orphan.join(", ")}`,
    );
  }
  if (pending.length === 0) {
    console.log("Pending: none");
    await client.end();
    process.exit(0);
  }
  console.log(`Pending (${pending.length}):`);
  for (const p of pending) {
    console.log(`  - ${p}`);
  }
  await client.end();
  process.exit(1);
}

async function main(): Promise<void> {
  const { client } = await connectWithPoolerFallback();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedSet(client);

    if (statusOnly) {
      await printStatusAndExit(client, applied);
    }

    const dir = join(__dirname, "..", "supabase", "migrations");
    let ran = 0;
    for (const name of MIGRATION_FILES) {
      if (applied.has(name)) {
        console.log(`skip ${name} (already applied)`);
        continue;
      }
      const sqlPath = join(dir, name);
      const sql = readFileSync(sqlPath, "utf-8");
      process.stdout.write(`Applying ${name}... `);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO public.${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
          [name],
        );
        await client.query("COMMIT");
        console.log("ok");
        ran += 1;
      } catch (e) {
        await client.query("ROLLBACK");
        console.log("failed");
        throw e;
      }
    }
    if (ran === 0) {
      console.log("No pending migrations.");
    } else {
      console.log(`Applied ${ran} migration(s).`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
