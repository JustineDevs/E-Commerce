import fs from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createSupabaseClient } from "../src/index.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(__dirname, "../../../.env") });

/**
 * Exports inventory_locations + variant-level available quantity snapshot (sum of movements)
 * as JSON Lines for Medusa Phase 3 stock-location import planning.
 *
 * Usage: pnpm exec tsx scripts/export-legacy-inventory-for-medusa.ts [out.jsonl]
 */
async function main() {
  const outPath = process.argv[2];
  const supabase = createSupabaseClient();

  const { data: locations, error: lErr } = await supabase
    .from("inventory_locations")
    .select("id, code, name, kind")
    .order("code");
  if (lErr) throw lErr;

  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, sku, product_id")
    .eq("is_active", true);
  if (vErr) throw vErr;

  const sink = outPath ? fs.createWriteStream(outPath, { flags: "w" }) : process.stdout;

  for (const loc of locations ?? []) {
    const lid = loc.id as string;
    for (const v of variants ?? []) {
      const vid = v.id as string;
      const { data: movements, error: mErr } = await supabase
        .from("inventory_movements")
        .select("qty_delta")
        .eq("variant_id", vid)
        .eq("location_id", lid);
      if (mErr) throw mErr;
      const onHand = (movements ?? []).reduce((s, r) => s + Number(r.qty_delta), 0);
      sink.write(
        `${JSON.stringify({
          location: loc,
          variant_id: vid,
          sku: v.sku,
          on_hand: onHand,
        })}\n`
      );
    }
  }

  if (outPath) {
    sink.end();
    await new Promise<void>((resolve, reject) => {
      sink.on("finish", resolve);
      sink.on("error", reject);
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
