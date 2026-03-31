import Link from "next/link";
import { AdminBreadcrumbs, AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { AdminTechnicalDetails } from "@/components/AdminTechnicalDetails";
import { requirePagePermission } from "@/lib/require-page-permission";

const sections: { href: string; title: string; description: string }[] = [
  {
    href: "/admin/cms/pages",
    title: "Pages",
    description: "Extra pages on your site: policies, landing pages, and custom URLs.",
  },
  {
    href: "/admin/cms/site-map",
    title: "Site map",
    description: "See every CMS page, parent slug health, and which slugs appear in navigation.",
  },
  {
    href: "/admin/cms/navigation",
    title: "Navigation & footer",
    description: "Menu links, footer columns, and social links visitors see in the header and footer.",
  },
  {
    href: "/admin/cms/announcement",
    title: "Announcement bar",
    description: "A slim banner at the top of the site for short messages or promos.",
  },
  {
    href: "/admin/cms/categories",
    title: "Category pages",
    description: "Intro text and banners for each product category in the shop.",
  },
  {
    href: "/admin/cms/media",
    title: "Media library",
    description: "Images and files you can reuse across pages and categories.",
  },
  {
    href: "/admin/cms/blog",
    title: "Blog",
    description: "Articles and updates shown under your site's blog section.",
  },
  {
    href: "/admin/cms/forms",
    title: "Form submissions",
    description: "Messages people send from contact or signup forms.",
  },
  {
    href: "/admin/cms/redirects",
    title: "Redirects",
    description: "Send visitors from an old link to a new page when URLs change.",
  },
  {
    href: "/admin/cms/experiments",
    title: "Page tests",
    description: "Try two versions of a page and split traffic to see what works better.",
  },
  {
    href: "/admin/cms/commerce",
    title: "Product lookup",
    description: "Find product IDs and handles to drop into content or campaigns.",
  },
];

export default async function CmsHubPage() {
  await requirePagePermission("content:read");

  return (
    <AdminPageShell
      title="Website content"
      subtitle="Edit what customers read and see on your public site: pages, menus, announcements, blog posts, and more. Product catalog, prices, and checkout still live in your main store system."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Content" }]}
        />
      }
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <AdminTechnicalDetails className="mb-8 max-w-3xl">
        <p>
          This area is often called a CMS. It stores content in your database and (for uploads) cloud
          storage. Product data is not edited here; it comes from your online store so prices and
          inventory stay in one place.
        </p>
      </AdminTechnicalDetails>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30 hover:shadow"
            >
              <h3 className="font-headline text-lg font-bold text-primary">{s.title}</h3>
              <p className="mt-2 font-body text-sm text-slate-600 leading-relaxed">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </AdminPageShell>
  );
}
