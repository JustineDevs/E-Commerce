/**
 * Applies listed `supabase/migrations/*.sql` in order using Postgres (no Supabase CLI).
 * Filenames are explicit in MIGRATION_FILES so order stays stable.
 * When you add `supabase/migrations/0xx_*.sql`, append the filename here in numeric order
 * (the script does not auto-discover files).
 * Uses LEGACY_DATABASE_URL (Supabase pooler URI) from repo root `.env`.
 *
 * For `supabase db push` instead, install the Supabase CLI globally and run:
 *   pnpm --filter @apparel-commerce/database migrate:cli
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
  "013_payment_connections.sql",
  "014_payment_connections_envelope_crypto.sql",
  "015_drop_accidental_medusa_core_tables_from_legacy.sql",
  "016_rls_payment_connections_staff.sql",
  "017_payment_connections_aftership.sql",
  "018_outbox_events.sql",
  "019_background_jobs.sql",
  "020_storefront_profiles_product_qa.sql",
  "021_cms_content_navigation_expansion.sql",
  "022_cms_sprint_extensions.sql",
  "023_remove_lemonsqueezy_payment_connections.sql",
  "enable_rls.sql",
  "rls_deny_anon_sensitive.sql",
] as const;

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

function switchPoolerPort(url: string, port: number): string {
  try {
    const u = new URL(url);
    u.port = String(port);
    return u.toString();
  } catch {
    return url;
  }
}

async function runSql(connectionString: string, sql: string): Promise<void> {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 20_000,
  });
  await client.connect();
  await client.query(sql);
  await client.end();
}

async function runOnceWithFallback(sql: string): Promise<void> {
  try {
    await runSql(databaseUrl!, sql);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (databaseUrl!.includes("pooler.supabase.com")) {
      const currentPort = new URL(databaseUrl!).port;
      const altPort = currentPort === "5432" ? "6543" : "5432";
      const altUrl = switchPoolerPort(databaseUrl!, altPort);
      console.log(
        `Primary pooler (${currentPort}) failed (${msg}). Trying port ${altPort}...`,
      );
      await runSql(altUrl, sql);
      return;
    }
    throw err;
  }
}

async function main(): Promise<void> {
  const dir = join(__dirname, "..", "supabase", "migrations");
  for (const name of MIGRATION_FILES) {
    const sqlPath = join(dir, name);
    const sql = readFileSync(sqlPath, "utf-8");
    process.stdout.write(`Applying ${name}... `);
    await runOnceWithFallback(sql);
    console.log("ok");
  }
  console.log("All migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
