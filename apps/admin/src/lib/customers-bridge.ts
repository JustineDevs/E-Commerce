import { medusaAdminFetch } from "@/lib/medusa-admin-http";

export type CrmCustomerRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  has_account: boolean;
  created_at: string;
};

export async function fetchMedusaCustomersForAdmin(
  limit = 100,
): Promise<CrmCustomerRow[]> {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("fields", "id,email,first_name,last_name,has_account,created_at");
  qs.set("order", "-created_at");
  const res = await medusaAdminFetch(`/admin/customers?${qs.toString()}`, {
    method: "GET",
  });
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as { customers?: unknown[] };
  const list = Array.isArray(json.customers) ? json.customers : [];
  const out: CrmCustomerRow[] = [];
  for (const raw of list) {
    const c = raw as Record<string, unknown>;
    out.push({
      id: String(c.id ?? ""),
      email: typeof c.email === "string" ? c.email : null,
      first_name: typeof c.first_name === "string" ? c.first_name : null,
      last_name: typeof c.last_name === "string" ? c.last_name : null,
      has_account: Boolean(c.has_account),
      created_at:
        typeof c.created_at === "string"
          ? c.created_at
          : new Date().toISOString(),
    });
  }
  return out;
}

export type CrmCustomerOrderRow = {
  id: string;
  customer_id: string | null;
  display_id: string;
  status: string;
  email: string | null;
  total_minor: number;
  currency_code: string;
  created_at: string;
};

export async function fetchMedusaCustomerById(
  customerId: string,
): Promise<CrmCustomerRow | null> {
  const qs = new URLSearchParams();
  qs.set("fields", "id,email,first_name,last_name,has_account,created_at");
  const res = await medusaAdminFetch(
    `/admin/customers/${encodeURIComponent(customerId)}?${qs.toString()}`,
    { method: "GET" },
  );
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as {
    customer?: Record<string, unknown>;
  };
  const raw = json.customer;
  if (!raw?.id) {
    return null;
  }
  return {
    id: String(raw.id ?? ""),
    email: typeof raw.email === "string" ? raw.email : null,
    first_name: typeof raw.first_name === "string" ? raw.first_name : null,
    last_name: typeof raw.last_name === "string" ? raw.last_name : null,
    has_account: Boolean(raw.has_account),
    created_at:
      typeof raw.created_at === "string"
        ? raw.created_at
        : new Date().toISOString(),
  };
}

/**
 * Orders for a Medusa customer (admin list; filters by customer_id when supported).
 */
export async function fetchMedusaOrdersForCustomer(
  customerId: string,
  limit = 80,
): Promise<CrmCustomerOrderRow[]> {
  const qs = new URLSearchParams();
  qs.set("limit", String(Math.min(200, Math.max(1, limit))));
  qs.set("offset", "0");
  qs.set("order", "-created_at");
  qs.set(
    "fields",
    "id,display_id,status,email,total,currency_code,created_at,customer_id",
  );
  qs.set("customer_id", customerId);
  let res = await medusaAdminFetch(`/admin/orders?${qs.toString()}`, {
    method: "GET",
  });
  if (!res.ok) {
    const qs2 = new URLSearchParams();
    qs2.set("limit", "200");
    qs2.set("offset", "0");
    qs2.set("order", "-created_at");
    qs2.set(
      "fields",
      "id,display_id,status,email,total,currency_code,created_at,customer_id",
    );
    res = await medusaAdminFetch(`/admin/orders?${qs2.toString()}`, {
      method: "GET",
    });
    if (!res.ok) {
      return [];
    }
    const json2 = (await res.json()) as { orders?: unknown[] };
    const rawOrders2 = Array.isArray(json2.orders) ? json2.orders : [];
    return mapOrderRows(rawOrders2).filter((o) => o.customer_id === customerId);
  }
  const json = (await res.json()) as { orders?: unknown[] };
  const rawOrders = Array.isArray(json.orders) ? json.orders : [];
  return mapOrderRows(rawOrders);
}

type OrderListRaw = Record<string, unknown> & { customer_id?: string | null };

function mapOrderRows(rawOrders: unknown[]): CrmCustomerOrderRow[] {
  const out: CrmCustomerOrderRow[] = [];
  for (const raw of rawOrders) {
    const o = raw as OrderListRaw;
    out.push({
      id: String(o.id ?? ""),
      customer_id:
        o.customer_id != null ? String(o.customer_id) : null,
      display_id:
        o.display_id != null ? String(o.display_id) : String(o.id ?? ""),
      status: String(o.status ?? ""),
      email: typeof o.email === "string" ? o.email : null,
      total_minor: Number.isFinite(Number(o.total)) ? Number(o.total) : 0,
      currency_code: String(o.currency_code ?? "PHP").toUpperCase(),
      created_at:
        typeof o.created_at === "string"
          ? o.created_at
          : new Date().toISOString(),
    });
  }
  return out;
}
