import { AdminBreadcrumbs, AdminPageShell } from "@/components/admin-console";
import { CatalogMediaManager } from "@/components/catalog/CatalogMediaManager";
import { requirePagePermission } from "@/lib/require-page-permission";

export const dynamic = "force-dynamic";

export default async function CatalogMediaPage() {
  await requirePagePermission("catalog:read");

  return (
    <AdminPageShell
      title="Catalog media"
      subtitle="Single source of truth for catalog bucket uploads: same POST /api/admin/catalog/media pipeline and cms_media rows as Product editor → Upload files / Pick from catalog library. List, edit display name and alt, tag, soft-delete, and see where each URL is referenced."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "Products", href: "/admin/catalog" },
            { label: "Catalog media" },
          ]}
        />
      }
    >
      <CatalogMediaManager />
    </AdminPageShell>
  );
}
