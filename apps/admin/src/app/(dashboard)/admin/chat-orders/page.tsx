import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { ChatIntakeForm } from "@/components/ChatIntakeForm";
import { fetchRecentChatIntake } from "@/lib/chat-intake-bridge";
import { getMedusaAdminDraftOrderEditUrl } from "@/lib/medusa-catalog-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

function formatIntakeStatus(status: string): string {
  const s = status.trim().toLowerCase().replace(/-/g, "_");
  if (s === "pending") return "In queue";
  if (s === "draft_created") return "Draft started in store";
  return status.replace(/_/g, " ");
}

function truncate(s: string | null, max: number): string {
  if (!s?.trim()) return "—";
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export default async function ChatOrdersPage() {
  await requirePagePermission("chat_orders:manage");
  const rows = await fetchRecentChatIntake(80);

  return (
    <AdminPageShell
      title="Chat orders"
      subtitle="Capture orders from chat or phone, attach real catalog lines, and open draft orders in your store when the system is connected."
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
          (staff session or x-internal-key). Line items must use Medusa variant ids.
        </p>
      </details>
      <section className="mb-10 max-w-xl">
        <ChatIntakeForm />
      </section>
      <div className="bg-surface-container-lowest rounded shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Notes</th>
              <th className="py-3 px-4">Address</th>
              <th className="py-3 px-4">Draft in store</th>
              <th className="py-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                  No intake rows yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const draftHref = r.medusa_draft_order_id
                  ? getMedusaAdminDraftOrderEditUrl(r.medusa_draft_order_id)
                  : null;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low/50"
                  >
                    <td className="py-3 px-4 font-medium">{r.source}</td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      {formatIntakeStatus(r.status)}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      {r.phone ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-[200px]">
                      {truncate(r.raw_text, 120)}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-[180px]">
                      {truncate(r.address, 80)}
                    </td>
                    <td className="py-3 px-4">
                      {draftHref ? (
                        <a
                          href={draftHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-primary hover:underline"
                        >
                          Open draft order
                        </a>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
