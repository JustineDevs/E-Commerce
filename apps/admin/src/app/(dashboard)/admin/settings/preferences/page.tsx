import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { AdminPreferencesForm } from "@/components/AdminPreferencesForm";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function AdminPreferencesPage() {
  await requirePagePermission("settings:read");

  return (
    <AdminPageShell
      title="Your preferences"
      subtitle="These choices apply to this browser only. They change layout density and default table sizes."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "Settings", href: "/admin/settings/preferences" },
            { label: "Preferences" },
          ]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <AdminPreferencesForm />
    </AdminPageShell>
  );
}
