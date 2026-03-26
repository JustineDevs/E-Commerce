import { Suspense } from "react";
import {
  AdminBreadcrumbs,
  AdminPageShell,
  AuditTimeline,
} from "@/components/admin-console";
import { DigitalReceiptLookup } from "@/components/DigitalReceiptLookup";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  await requirePagePermission("receipts:read");

  return (
    <AdminPageShell
      title="Digital receipts"
      subtitle="Receipts saved after checkout. Look up by order number."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Receipts" }]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <Suspense
        fallback={
          <p className="text-sm text-on-surface-variant">Loading…</p>
        }
      >
        <DigitalReceiptLookup />
      </Suspense>
    </AdminPageShell>
  );
}
