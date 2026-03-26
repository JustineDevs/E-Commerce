import Link from "next/link";
import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { fetchMedusaCustomersForAdmin } from "@/lib/customers-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";
import { CrmClientEnhancements } from "./CrmClientEnhancements";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  await requirePagePermission("crm:read");
  const customers = await fetchMedusaCustomersForAdmin(120);

  return (
    <AdminPageShell
      title="CRM"
      subtitle={`Showing ${customers.length} customers.`}
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "CRM" }]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <CrmClientEnhancements />

      <div className="bg-surface-container-lowest rounded shadow overflow-hidden mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Account</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Detail</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-on-surface-variant">
                  No customers yet.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container-low/50"
                >
                  <td className="py-3 px-4 font-medium">{c.email ?? "—"}</td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {c.has_account ? "Yes" : "No"}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/crm/${encodeURIComponent(c.id)}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
