import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { StorefrontHomeEditor } from "@/components/StorefrontHomeEditor";
import { StorefrontPublicMetadataEditor } from "@/components/StorefrontPublicMetadataEditor";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function StorefrontHomeCmsPage() {
  await requirePagePermission("settings:read");

  return (
    <AdminPageShell
      title="Storefront home"
      subtitle="Edit contact and social links (footer and contact page), then the home page: hero text, category tiles, latest section, and newsletter. Images use public URLs (for example from product media). Saving publishes to the live site for new visitors."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "Settings", href: "/admin/settings/payments" },
            { label: "Storefront home" },
          ]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <div className="flex flex-col gap-8">
        <StorefrontPublicMetadataEditor />
        <StorefrontHomeEditor />
      </div>
    </AdminPageShell>
  );
}
