import type { ReactNode } from "react";
import { AdminBreadcrumbs } from "./AdminBreadcrumbs";
import { AdminPageShell } from "./AdminPageShell";
import { AuditTimeline } from "./AuditTimeline";

export function CmsPageFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      breadcrumbs={
        <AdminBreadcrumbs
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "Content", href: "/admin/cms" },
            { label: title },
          ]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      {children}
    </AdminPageShell>
  );
}
