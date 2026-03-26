import Link from "next/link";
import {
  AdminBreadcrumbs,
  AdminPageShell,
  AuditTimeline,
} from "@/components/admin-console";
import {
  fetchMedusaCustomerById,
  fetchMedusaOrdersForCustomer,
} from "@/lib/customers-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function CrmCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await requirePagePermission("crm:read");
  const { customerId } = await params;
  const customer = await fetchMedusaCustomerById(customerId);
  if (!customer) {
    return (
      <AdminPageShell
        title="Customer unavailable"
        subtitle="No customer record for this id, or the commerce service returned no data."
        breadcrumbs={
          <AdminBreadcrumbs
            items={[
              { label: "Dashboard", href: "/admin" },
              { label: "CRM", href: "/admin/crm" },
              { label: "Unavailable" },
            ]}
          />
        }
      >
        <Link href="/admin/crm" className="text-primary underline text-sm font-semibold">
          Back to CRM
        </Link>
      </AdminPageShell>
    );
  }

  const orders = await fetchMedusaOrdersForCustomer(customerId, 100);

  return (
    <AdminPageShell
      title={
        [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
        customer.email ||
        "Customer"
      }
      subtitle={customer.email ?? "No email on file"}
      breadcrumbs={
        <AdminBreadcrumbs
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "CRM", href: "/admin/crm" },
            { label: "Customer" },
          ]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
            Profile
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-on-surface-variant text-xs uppercase tracking-wide">Email</dt>
              <dd className="font-medium">{customer.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs uppercase tracking-wide">Store ID</dt>
              <dd className="font-mono text-xs break-all">{customer.id}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs uppercase tracking-wide">Account</dt>
              <dd>{customer.has_account ? "Registered" : "Guest profile"}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs uppercase tracking-wide">Created</dt>
              <dd>{new Date(customer.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
            Orders ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No orders linked to this customer in the store.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/15 text-sm max-h-96 overflow-y-auto">
              {orders.map((o) => (
                <li key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-primary">#{o.display_id}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {o.status.replace(/_/g, " ")} ·{" "}
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {o.currency_code}{" "}
                      {(o.total_minor / 100).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(o.id)}`}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Open order
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminPageShell>
  );
}
