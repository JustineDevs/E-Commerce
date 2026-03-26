import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { AnalyticsChartsPanel } from "@/components/AnalyticsChartsPanel";
import {
  fetchAnalyticsSummary,
  fetchValidatedAnalyticsCharts,
} from "@/lib/analytics-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";
import { RetentionPanel } from "./RetentionPanel";
import { SalesTrendsPanel } from "./SalesTrendsPanel";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requirePagePermission("analytics:read");
  const [s, charts] = await Promise.all([
    fetchAnalyticsSummary(),
    fetchValidatedAnalyticsCharts(),
  ]);

  return (
    <AdminPageShell
      title="Analytics"
      subtitle="Sales and order trends from recent activity."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Analytics" }]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-surface-container-lowest p-6 rounded border border-outline-variant/20">
          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
            Orders
          </span>
          <p className="text-3xl font-bold text-primary mt-2">{s.orderCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded border border-outline-variant/20">
          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
            Revenue ({s.currency})
          </span>
          <p className="text-3xl font-bold text-primary mt-2">
            {s.revenueTotal.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded border border-outline-variant/20">
          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
            Paid / shipped
          </span>
          <p className="text-3xl font-bold text-primary mt-2">{s.paidCount}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded border border-outline-variant/20">
          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
            Pending
          </span>
          <p className="text-3xl font-bold text-primary mt-2">{s.pendingCount}</p>
        </div>
      </section>

      {charts ? (
        <AnalyticsChartsPanel payload={charts} />
      ) : (
        <section className="mt-10 rounded border border-outline-variant/30 bg-surface-container-lowest p-6">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Charts did not load. Try refreshing. If it keeps happening, ask whoever manages your website
            hosting to confirm the store and reporting services are running.
          </p>
        </section>
      )}

      <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RetentionPanel />
        <SalesTrendsPanel />
      </section>
    </AdminPageShell>
  );
}
