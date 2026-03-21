import fs from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createSupabaseClient } from "../src/index.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: join(__dirname, "../../../.env") });

type Row = {
  product: Record<string, unknown>;
  images: Record<string, unknown>[];
  variants: Record<string, unknown>[];
};

/**
 * Reads legacy `products`, `product_images`, `product_variants` and writes JSON Lines
 * for Medusa Phase 2 import (workflow / Admin API consumer). One product per line.
 *
 * Usage: pnpm exec tsx scripts/export-legacy-catalog-for-medusa.ts [out.jsonl]
 */
async function main() {
  const outPath = process.argv[2];
  const supabase = createSupabaseClient();

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, slug, name, description, category, status, brand")
    .order("slug");
  if (pErr) throw pErr;
  const list = products ?? [];

  const sink = outPath ? fs.createWriteStream(outPath, { flags: "w" }) : process.stdout;

  for (const p of list) {
    const pid = p.id as string;
    const [{ data: images, error: iErr }, { data: variants, error: vErr }] = await Promise.all([
      supabase.from("product_images").select("id, image_url, sort_order").eq("product_id", pid).order("sort_order"),
      supabase
        .from("product_variants")
        .select("id, sku, barcode, size, color, price, compare_at_price, cost, is_active")
        .eq("product_id", pid),
    ]);
    if (iErr) throw iErr;
    if (vErr) throw vErr;

    const row: Row = {
      product: p as Record<string, unknown>,
      images: (images ?? []) as Record<string, unknown>[],
      variants: (variants ?? []) as Record<string, unknown>[],
    };
    sink.write(`${JSON.stringify(row)}\n`);
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
