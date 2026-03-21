import fs from "node:fs";
import readline from "node:readline";
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { batchInventoryItemLevelsWorkflow } from "@medusajs/medusa/core-flows";

const LEGACY_LOC_META_KEY = "legacy_inventory_location_code";

type InventoryRow = {
  location: { id?: unknown; code?: unknown; name?: unknown };
  variant_id: string;
  sku: string | null;
  on_hand: number;
};

function resolveJsonlPath(): string {
  const fromEnv = process.env.MIGRATION_INVENTORY_JSONL?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }
  const argvTail = process.argv.filter((a) => a.endsWith(".jsonl"));
  if (argvTail.length && fs.existsSync(argvTail[argvTail.length - 1])) {
    return argvTail[argvTail.length - 1];
  }
  throw new Error(
    "Set MIGRATION_INVENTORY_JSONL to a readable .jsonl path, or pass a .jsonl path as the last CLI argument.",
  );
}

export default async function importLegacyInventoryJsonl({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const inventoryModuleService = container.resolve(Modules.INVENTORY);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);

  const path = resolveJsonlPath();
  logger.info(`Import inventory JSONL: ${path}`);

  const medusaLocations = await stockLocationModuleService.listStockLocations(
    {},
    { take: 500 },
  );

  function resolveLocationId(
    loc: InventoryRow["location"],
  ): string | undefined {
    const code = loc?.code != null ? String(loc.code).trim() : "";
    const byMeta = medusaLocations.find(
      (s) =>
        s.metadata?.[LEGACY_LOC_META_KEY] != null &&
        String(s.metadata[LEGACY_LOC_META_KEY]) === code,
    );
    if (byMeta) {
      return byMeta.id;
    }
    const name = loc?.name != null ? String(loc.name).trim() : "";
    const byName = medusaLocations.find((s) => s.name === name);
    if (byName) {
      return byName.id;
    }
    return undefined;
  }

  const stream = fs.createReadStream(path, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNo = 0;
  let updated = 0;
  let created = 0;
  let skipped = 0;
  const toCreate: {
    location_id: string;
    inventory_item_id: string;
    stocked_quantity: number;
  }[] = [];
  const toUpdate: {
    id: string;
    inventory_item_id: string;
    location_id: string;
    stocked_quantity: number;
  }[] = [];

  const batchSize = Math.max(
    50,
    Number(process.env.MIGRATION_INVENTORY_BATCH ?? 200),
  );

  const flushWorkflows = async () => {
    if (!toCreate.length && !toUpdate.length) {
      return;
    }
    const createBatch = [...toCreate];
    const updateBatch = [...toUpdate];
    await batchInventoryItemLevelsWorkflow(container).run({
      input: {
        create: createBatch,
        update: updateBatch,
      },
    });
    created += createBatch.length;
    updated += updateBatch.length;
    toCreate.length = 0;
    toUpdate.length = 0;
  };

  for await (const line of rl) {
    lineNo += 1;
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let row: InventoryRow;
    try {
      row = JSON.parse(trimmed) as InventoryRow;
    } catch {
      throw new Error(`Invalid JSON at line ${lineNo}`);
    }

    const locationId = resolveLocationId(row.location);
    if (!locationId) {
      logger.warn(
        `Line ${lineNo}: no Medusa stock location for legacy location code=${String(row.location?.code)} name=${String(row.location?.name)}: set stock location metadata ${LEGACY_LOC_META_KEY} or align names.`,
      );
      skipped += 1;
      continue;
    }

    const sku = row.sku != null ? String(row.sku).trim() : "";
    if (!sku) {
      skipped += 1;
      continue;
    }

    const items = await inventoryModuleService.listInventoryItems({ sku });
    const item = items[0];
    if (!item) {
      logger.warn(
        `Line ${lineNo}: no inventory item for SKU ${sku}: import catalog first.`,
      );
      skipped += 1;
      continue;
    }

    const qty = Math.max(0, Math.floor(Number(row.on_hand)));
    const levels = await inventoryModuleService.listInventoryLevels({
      inventory_item_id: item.id,
      location_id: locationId,
    });
    const level = levels[0];

    if (level) {
      toUpdate.push({
        id: level.id,
        inventory_item_id: item.id,
        location_id: locationId,
        stocked_quantity: qty,
      });
    } else {
      toCreate.push({
        location_id: locationId,
        inventory_item_id: item.id,
        stocked_quantity: qty,
      });
    }

    if (toCreate.length + toUpdate.length >= batchSize) {
      await flushWorkflows();
    }
  }

  await flushWorkflows();

  logger.info(
    `Inventory import finished: levels_created=${created} levels_updated=${updated} skipped=${skipped} lines=${lineNo}`,
  );
}
