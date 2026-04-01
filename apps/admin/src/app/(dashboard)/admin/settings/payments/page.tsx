import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { PaymentProviderLabel } from "@/components/PaymentProviderLabel";
import { fetchMedusaPaymentProvidersBundle } from "@/lib/payment-providers-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function PaymentSettingsPage() {
  await requirePagePermission("settings:read");
  const {
    byRegion,
    systemRegisteredIds,
    medusaUrl,
    regionsError,
    systemError,
  } = await fetchMedusaPaymentProvidersBundle();

  return (
    <AdminPageShell
      title="Payments"
      subtitle="See which payment methods customers can use at checkout, and how they line up with each sales region (for example Philippines). New methods must be allowed for that region in your main store settings before they appear here."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "Settings", href: "/admin/settings/payments" },
            { label: "Payments" },
          ]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <details className="mb-8 max-w-3xl text-xs text-on-surface-variant">
          <summary className="cursor-pointer font-medium text-on-surface select-none">
            Details for IT or your developer
          </summary>
          <p className="mt-2 border-l-2 border-outline-variant/40 pl-3">
            Store service URL:{" "}
            <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-[11px]">
              {medusaUrl}
            </code>
          </p>
        </details>

      {(regionsError || systemError) && (
        <div className="mb-8 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Payment settings unavailable</p>
          <p className="mt-2 text-on-surface-variant leading-relaxed">
            This usually means the link to your store is off, or the secure key this app uses to talk
            to your store does not match. If you are not managing servers yourself, send this screen
            to whoever maintains your website or hosting.
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-amber-900">
              Technical message (for support)
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              {regionsError && (
                <p className="font-mono whitespace-pre-wrap text-amber-950/90">{regionsError}</p>
              )}
              {systemError && (
                <p className="font-mono whitespace-pre-wrap text-amber-950/90">{systemError}</p>
              )}
              <p className="text-on-surface-variant font-sans leading-relaxed">
                They should confirm the store URL and connection key in this app match your main store
                settings, and that the store service is running.
              </p>
            </div>
          </details>
        </div>
      )}

      <section className="mb-10">
        <h3 className="text-lg font-bold text-primary font-headline mb-2">
          What checkout can use (by region)
        </h3>
        <p className="text-on-surface-variant text-sm mb-4 max-w-3xl leading-relaxed">
          These are the payment options actually available to shoppers for each region. If something
          is missing, open your main store admin, go to Settings, then Regions, pick the region, and
          add the payment methods you want.
        </p>
        <div className="bg-surface-container-lowest rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
                <th className="py-3 px-4">Payment method</th>
                <th className="py-3 px-4">Region</th>
              </tr>
            </thead>
            <tbody>
              {byRegion.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-on-surface-variant">
                    No payment methods are linked to a region yet.
                  </td>
                </tr>
              ) : (
                byRegion.map((p) => (
                  <tr
                    key={`${p.regionId}-${p.id}`}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low/50"
                  >
                    <td className="py-3 px-4 align-top">
                      <PaymentProviderLabel id={p.id} />
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant align-top">
                      <span className="font-medium text-on-surface" title={p.regionId}>
                        {p.regionName}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-primary font-headline mb-2">
          All payment services on your store
        </h3>
        <p className="text-on-surface-variant text-sm mb-4 max-w-3xl leading-relaxed">
          Everything your store is set up to use. A service can appear here but still needs to be
          turned on for a region in the table above before customers see it at checkout.
        </p>
        <div className="bg-surface-container-lowest rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
                <th className="py-3 px-4">Payment service</th>
              </tr>
            </thead>
            <tbody>
              {systemRegisteredIds.length === 0 ? (
                <tr>
                  <td className="py-12 text-center text-on-surface-variant leading-relaxed px-4">
                    Nothing loaded yet. Ask your hosting or IT contact to confirm the store is running
                    and payment providers are enabled, then try again.
                  </td>
                </tr>
              ) : (
                systemRegisteredIds.map((id) => (
                  <tr
                    key={id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low/50"
                  >
                    <td className="py-3 px-4 align-top">
                      <PaymentProviderLabel id={id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h3 className="text-lg font-bold text-primary font-headline mb-2">
          Payment provider credentials
        </h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          Card and wallet providers (for example Stripe, PayPal, GCash, PayMaya) and their notifications are
          configured on the commerce server by your technical contact. After any key change, that server
          usually needs a restart. This screen is read-only and does not store payment secrets.
        </p>
      </section>
    </AdminPageShell>
  );
}
