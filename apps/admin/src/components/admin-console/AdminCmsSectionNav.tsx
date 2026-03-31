"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/admin/cms", label: "Hub" },
  { href: "/admin/cms/pages", label: "Pages" },
  { href: "/admin/cms/site-map", label: "Site map" },
  { href: "/admin/cms/navigation", label: "Navigation" },
  { href: "/admin/cms/announcement", label: "Announcement" },
  { href: "/admin/cms/categories", label: "Categories" },
  { href: "/admin/cms/media", label: "Media" },
  { href: "/admin/cms/blog", label: "Blog" },
  { href: "/admin/cms/forms", label: "Forms" },
  { href: "/admin/cms/redirects", label: "Redirects" },
  { href: "/admin/cms/experiments", label: "Experiments" },
  { href: "/admin/cms/commerce", label: "Product lookup" },
];

export function AdminCmsSectionNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Content sections"
      className="flex flex-wrap gap-1 border-b border-outline-variant/15 bg-white/90 px-4 py-2 lg:px-8"
    >
      {LINKS.map((l) => {
        const active =
          l.href === "/admin/cms"
            ? pathname === "/admin/cms"
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
