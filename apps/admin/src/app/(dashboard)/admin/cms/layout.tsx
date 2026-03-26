import { AdminCmsSectionNav } from "@/components/admin-console/AdminCmsSectionNav";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminCmsSectionNav />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
