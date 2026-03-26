import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { fetchRecentChannelEvents } from "@/lib/channel-events-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  await requirePagePermission("channels:manage");
  const events = await fetchRecentChannelEvents(80);

  return (
    <AdminPageShell
      title="Channel sync"
      subtitle="See recent messages from your sales channels (for example marketplaces or partners). Your integration partner sends updates here so you can confirm they arrived."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Channels" }]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <details className="mb-8 max-w-3xl text-xs text-on-surface-variant">
          <summary className="cursor-pointer font-medium text-on-surface select-none">
            Details for IT or your developer
          </summary>
          <p className="mt-2 border-l-2 border-outline-variant/40 pl-3 leading-relaxed">
            Partners send updates to an inbound webhook. In production, set{" "}
            <code className="text-[11px] bg-surface-container-high px-1 rounded">CHANNEL_WEBHOOK_SECRET</code>{" "}
            and validate the <code className="text-[11px]">x-channel-signature</code> header (HMAC-SHA256
            of the raw body). Endpoint path:{" "}
            <code className="text-[11px] bg-surface-container-high px-1 rounded">
              /api/integrations/channels/webhook
            </code>
          </p>
        </details>
      <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
              <th className="py-3 px-4">Channel</th>
              <th className="py-3 px-4">Event</th>
              <th className="py-3 px-4">Received</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-on-surface-variant leading-relaxed px-4">
                  No events yet. When your channel partner sends updates, they will appear here.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container-low/50"
                >
                  <td className="py-3 px-4 font-medium">{e.channel}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{e.event_type}</td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {new Date(e.received_at).toLocaleString()}
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
