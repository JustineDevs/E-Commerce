import { createStorefrontMedusaSdk } from "./medusa-sdk";
import { medusaMinorToMajor } from "./medusa-money";
import { getMedusaPublishableKey } from "./storefront-medusa-env";

export type AccountOrder = {
  id: string;
  displayId: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  itemCount: number;
};

/** Simple shopper-facing KPIs from Medusa order list (same currency assumed). */
export function computeAccountOrderStats(orders: AccountOrder[]): {
  orderCount: number;
  lifetimeSpend: number;
  averageOrderValue: number;
} {
  const orderCount = orders.length;
  const lifetimeSpend = orders.reduce((s, o) => s + (o.total || 0), 0);
  const averageOrderValue =
    orderCount > 0 ? Math.round((lifetimeSpend / orderCount) * 100) / 100 : 0;
  return { orderCount, lifetimeSpend, averageOrderValue };
}

/** Store API order list rows (snake_case fields from expanded list query). */
type OrderListRow = {
  id?: string;
  display_id?: string | number;
  email?: string | null;
  status?: string;
  total?: number;
  currency_code?: string;
  created_at?: string;
  items?: unknown[];
};

export async function fetchCustomerOrders(
  email: string,
): Promise<{ orders: AccountOrder[]; error: string | null }> {
  const key = getMedusaPublishableKey();
  if (!key) {
    return { orders: [], error: "Commerce is not configured." };
  }
  try {
    const sdk = createStorefrontMedusaSdk();
    const { orders } = await sdk.store.order.list({
      fields:
        "id,email,display_id,status,total,currency_code,created_at,*items",
      limit: 20,
      offset: 0,
    } as never);

    if (!orders || !Array.isArray(orders)) {
      return { orders: [], error: null };
    }

    const rows = orders as unknown as OrderListRow[];
    const normalizedEmail = email.toLowerCase();

    const mapped: AccountOrder[] = rows
      .filter((o) => {
        const orderEmail = o.email;
        return (
          typeof orderEmail === "string" &&
          orderEmail.toLowerCase() === normalizedEmail
        );
      })
      .map((o) => ({
        id: String(o.id ?? ""),
        displayId:
          o.display_id != null ? String(o.display_id) : String(o.id ?? ""),
        status: String(o.status ?? "unknown"),
        total:
          typeof o.total === "number"
            ? medusaMinorToMajor(
                o.total,
                String(o.currency_code ?? "PHP"),
              )
            : 0,
        currency: String(o.currency_code ?? "PHP").toUpperCase(),
        createdAt: String(o.created_at ?? ""),
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
      }));

    return { orders: mapped, error: null };
  } catch {
    return { orders: [], error: null };
  }
}
