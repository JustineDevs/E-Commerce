import type { AdminOperationResult } from "@/lib/admin-operation-result";
import { adminErr, adminOk } from "@/lib/admin-operation-result";
import {
  fetchMedusaCustomersForAdmin,
  type CrmCustomerRow,
} from "@/lib/customers-bridge";

export type CustomerOperations = {
  listCustomers(_limit: number): Promise<
    AdminOperationResult<{ customers: CrmCustomerRow[] }>
  >;
};

export function createMedusaCustomerOperations(): CustomerOperations {
  return {
    async listCustomers(limit) {
      try {
        const customers = await fetchMedusaCustomersForAdmin(limit);
        return adminOk({ customers });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return adminErr("CUSTOMERS_LIST", msg, 502);
      }
    },
  };
}
