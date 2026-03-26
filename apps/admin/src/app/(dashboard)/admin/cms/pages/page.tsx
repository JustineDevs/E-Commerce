import { CmsPageFrame } from "@/components/admin-console";
import { CmsPagesManager } from "@/components/cms/CmsPagesManager";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function CmsPagesAdminPage() {
  await requirePagePermission("content:read");

  return (
    <CmsPageFrame
      title="CMS pages"
      subtitle="Published pages appear on your site at /p/your-page-name. Use the editor for the page body and content blocks (hero, text, image, calls to action)."
    >
      <CmsPagesManager />
    </CmsPageFrame>
  );
}
