import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { StorefrontHomeEditor } from "@/components/StorefrontHomeEditor";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function StorefrontHomeCmsPage() {
  await requirePagePermission("settings:read");

  return (
    <AdminPageShell
      title="Storefront home"
      subtitle="Edit the public shop home page: hero text, category tiles, latest section titles, and the newsletter block. Images use public URLs (for example links copied from product media in your store admin). Saving publishes to the live site for new visitors."
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
      <StorefrontHomeEditor />
    </AdminPageShell>
  );
}
