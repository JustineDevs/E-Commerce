import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { ChatIntakeForm } from "@/components/ChatIntakeForm";
import { fetchRecentChatIntake } from "@/lib/chat-intake-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function ChatOrdersPage() {
  await requirePagePermission("chat_orders:manage");
  const rows = await fetchRecentChatIntake(80);

  return (
    <AdminPageShell
      title="Chat orders"
      subtitle="Orders from chat or phone go into a queue and can be linked to draft orders until payment is completed."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Chat orders" }]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <details className="mb-8 max-w-3xl text-xs text-on-surface-variant">
          <summary className="cursor-pointer font-medium text-on-surface select-none">
            Technical integration
          </summary>
          <p className="mt-2 border-l-2 border-outline-variant/40 pl-3 leading-relaxed">
            Automated intake may POST to{" "}
            <code className="text-[11px] bg-surface-container-high px-1 rounded">
              /api/integrations/chat-orders/intake
            </code>{" "}
            (staff session or x-internal-key).
          </p>
        </details>
      <section className="mb-10 max-w-xl">
        <ChatIntakeForm />
      </section>
      <div className="bg-surface-container-lowest rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Draft</th>
              <th className="py-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-on-surface-variant">
                  No intake rows yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container-low/50"
                >
                  <td className="py-3 px-4 font-medium">{r.source}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{r.status}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{r.phone ?? "—"}</td>
                  <td className="py-3 px-4 text-on-surface-variant font-mono text-xs">
                    {r.medusa_draft_order_id ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {new Date(r.created_at).toLocaleString()}
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
