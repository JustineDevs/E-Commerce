import {
  AdminBreadcrumbs,
  AdminPageShell,
  AuditTimeline,
} from "@/components/admin-console";
import { DigitalReceiptLookup } from "@/components/DigitalReceiptLookup";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  await requirePagePermission("receipts:read");
  const sp = await searchParams;
  const initialOrderId =
    typeof sp.order_id === "string" ? sp.order_id.trim() : "";

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
      <DigitalReceiptLookup initialOrderId={initialOrderId} />
    </AdminPageShell>
  );
}
