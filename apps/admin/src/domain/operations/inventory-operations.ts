import type { AdminOperationResult } from "@/lib/admin-operation-result";
import { adminErr, adminOk } from "@/lib/admin-operation-result";
import {
  fetchAllMedusaInventoryRows,
  type MedusaInventoryRow,
} from "@/lib/medusa-inventory-bridge";

export type InventoryOperations = {
  listInventory(): Promise<
    AdminOperationResult<{ rows: MedusaInventoryRow[] }>
  >;
};

export function createMedusaInventoryOperations(): InventoryOperations {
  return {
    async listInventory() {
      try {
        const rows = await fetchAllMedusaInventoryRows({ batchSize: 100 });
        return adminOk({ rows });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return adminErr("INVENTORY_LIST", msg, 502);
      }
    },
  };
}
