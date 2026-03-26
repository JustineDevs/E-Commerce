import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminBreadcrumbs, AdminPageShell } from "@/components/admin-console";
import { requirePagePermission } from "@/lib/require-page-permission";

export const metadata: Metadata = {
  title: "Admin guide",
  description:
    "How to use the store back office: dashboards, products, orders, content, and settings.",
};

const toc = [
  { href: "#start-here", label: "Start here" },
  { href: "#commerce", label: "Commerce" },
  { href: "#operations", label: "Operations" },
  { href: "#marketing", label: "Marketing" },
  { href: "#settings", label: "Settings" },
  { href: "#roles", label: "Administrators, staff, and permissions" },
  { href: "#tips", label: "Tips and support" },
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-headline text-xl font-bold tracking-tight text-primary sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 font-body text-sm leading-relaxed text-on-surface">
        {children}
      </div>
    </section>
  );
}

function Subheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 text-base font-semibold text-primary first:mt-0">{children}</h3>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-on-surface-variant">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export default async function AdminDocsPage() {
  await requirePagePermission("dashboard:read");

  const tocNav = (
    <nav
      aria-label="On this page"
      className="rounded-xl border border-outline-variant/20 bg-white/90 p-4 shadow-sm"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        On this page
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {toc.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <AdminPageShell
      title="Admin guide"
      subtitle="A practical guide for store owners and managers. No technical background required. Use the left menu to open any area; this page explains what each area is for and how to work through common tasks."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Admin guide" }]}
        />
      }
      inspector={tocNav}
    >
      <div className="mx-auto max-w-3xl space-y-14 pb-16">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <p className="font-body text-sm leading-relaxed text-on-surface-variant">
            This back office connects to your online catalog, checkout, and customer records. Numbers
            and lists update when the store systems are online. If you see a connection message on
            the home screen, wait a moment and refresh, or contact whoever maintains your hosting.
          </p>
        </div>

        <Section id="start-here" title="Start here">
          <p>
            After you sign in, you land on the{" "}
            <strong className="text-primary">Overview</strong> (Dashboard). The left sidebar groups
            tools into Commerce, Operations, Marketing, and Settings. Your account email and role
            appear at the bottom; use <strong className="text-primary">Logout</strong> when you
            finish on a shared computer.
          </p>
          <p className="mt-4">
            Press <strong className="text-primary">Ctrl+K</strong> (Windows) or{" "}
            <strong className="text-primary">Cmd+K</strong> (Mac), or use{" "}
            <strong className="text-primary">Search pages</strong> in the sidebar, to open search
            and jump to any screen by name.
          </p>
          <Subheading>Typical daily flow</Subheading>
          <BulletList
            items={[
              "Check Overview for new orders and stock warnings.",
              "Open Orders to confirm, pack, or update status.",
              "Use Inventory when you need exact counts or locations.",
              "Use Content when you change website text, banners, or blog posts.",
            ]}
          />
        </Section>

        <Section id="commerce" title="Commerce">
          <Subheading>
            <Link href="/admin" className="text-primary underline">
              Dashboard (Overview)
            </Link>
          </Subheading>
          <p>
            High-level counts: total orders, active orders, low or out-of-stock signals, and quick
            links into Orders, Inventory, and POS. Recent orders may appear for fast access.
          </p>

          <Subheading>
            <Link href="/admin/catalog" className="text-primary underline">
              Products
            </Link>
          </Subheading>
          <p>
            Your sellable items: titles, descriptions, images, variants (such as size or color),
            and pricing. Search and filters help you find SKUs quickly. Use{" "}
            <strong className="text-primary">Add product</strong> for new items, or open a row to
            edit details. Product data is the source for what shoppers see on the website.
          </p>

          <Subheading>
            <Link href="/admin/inventory" className="text-primary underline">
              Inventory
            </Link>
          </Subheading>
          <p>
            Stock levels by location or variant. Use this when you reconcile physical counts, spot
            shortages, or confirm availability before a promotion. Refresh the view if numbers look
            stale after warehouse updates.
          </p>

          <Subheading>
            <Link href="/admin/orders" className="text-primary underline">
              Orders
            </Link>
          </Subheading>
          <p>
            Every customer order from the website (and other connected channels, if configured).
            Open an order to see line items, payment status, shipping details, and customer contact
            information. From an order you can move to related tools such as receipts when your
            process allows it.
          </p>

          <Subheading>
            <Link href="/admin/pos" className="text-primary underline">
              POS (point of sale)
            </Link>
          </Subheading>
          <p>
            In-store or counter sales. Staff typically start or close a shift, ring up items, and
            follow your store policy for voids or manager approval. Use this when shoppers pay in
            person rather than on the website.
          </p>

          <Subheading>
            <Link href="/admin/offline-queue" className="text-primary underline">
              Offline queue
            </Link>
          </Subheading>
          <p>
            Holds actions that could not sync while the network was down. Review this after
            connectivity returns so nothing is left pending.
          </p>

          <Subheading>
            <Link href="/admin/crm" className="text-primary underline">
              CRM
            </Link>
          </Subheading>
          <p>
            Customer relationship management: profiles, contact history, and notes that help your
            team serve repeat buyers. Open a customer to see detail and activity in one place.
          </p>
        </Section>

        <Section id="operations" title="Operations">
          <Subheading>
            <Link href="/admin/employees" className="text-primary underline">
              Employees
            </Link>
          </Subheading>
          <p>
            Staff accounts, roles, and who may sign in to this back office. Keep this accurate when
            people join or leave so access stays appropriate.
          </p>

          <Subheading>
            <Link href="/admin/devices" className="text-primary underline">
              Devices
            </Link>
          </Subheading>
          <p>
            Registered hardware such as tablets or terminals used with POS or in-store workflows.
            Use it to align devices with your security policy.
          </p>

          <Subheading>
            <Link href="/admin/channels" className="text-primary underline">
              Channels
            </Link>
          </Subheading>
          <p>
            Sales channels (for example web versus wholesale). Adjust which catalog or pricing
            applies where, according to how your business is set up.
          </p>

          <Subheading>
            <Link href="/admin/chat-orders" className="text-primary underline">
              Chat orders
            </Link>
          </Subheading>
          <p>
            Orders or requests that arrive through chat-based workflows. Process them alongside
            standard web orders so fulfillment stays consistent.
          </p>
        </Section>

        <Section id="marketing" title="Marketing">
          <Subheading>
            <Link href="/admin/analytics" className="text-primary underline">
              Analytics
            </Link>
          </Subheading>
          <p>
            Charts and metrics for revenue, traffic patterns, and performance. Use them in reviews
            with marketing and finance to decide what to scale or fix.
          </p>

          <Subheading>
            <Link href="/admin/loyalty" className="text-primary underline">
              Loyalty
            </Link>
          </Subheading>
          <p>
            Points, tiers, and rewards for repeat customers. Enroll shoppers, adjust balances when
            policy allows, and maintain the rewards your brand advertises.
          </p>

          <Subheading>
            <Link href="/admin/campaigns" className="text-primary underline">
              Campaigns
            </Link>
          </Subheading>
          <p>
            Marketing campaigns and audience segments. Create or schedule outreach, track what is
            active, and coordinate with your creative and legal guidelines.
          </p>

          <Subheading>
            <Link href="/admin/settings/storefront" className="text-primary underline">
              Storefront home
            </Link>
          </Subheading>
          <p>
            Hero text, imagery, and featured content on your public home page. Changes here affect
            the first impression visitors get; pair with Content for full site updates.
          </p>

          <Subheading>
            <Link href="/admin/cms" className="text-primary underline">
              Content
            </Link>
          </Subheading>
          <p>
            The website editor hub. Product prices and cart behavior still come from your commerce
            system; Content covers what customers read and see outside the product grid.
          </p>
          <BulletList
            items={[
              "Pages: extra pages such as policies or landing pages.",
              "Navigation and footer: header menus, footer columns, and social links.",
              "Announcement bar: short banner at the top for promos or notices.",
              "Category pages: intros and visuals for each shop category.",
              "Media library: reusable images and files.",
              "Blog: articles and news.",
              "Form submissions: messages from contact or signup forms.",
              "Redirects: map old URLs to new ones after a rename.",
              "Page tests: compare two versions of a page to learn what performs better.",
              "Product lookup: find product IDs and handles for content or campaigns.",
            ]}
          />
        </Section>

        <Section id="settings" title="Settings">
          <Subheading>
            <Link href="/admin/settings/payments" className="text-primary underline">
              Payments
            </Link>
          </Subheading>
          <p>
            Payment methods and provider settings used at checkout. Changes here affect how
            customers pay online; coordinate with finance before switching providers.
          </p>

          <Subheading>
            <Link href="/admin/receipts" className="text-primary underline">
              Receipts
            </Link>
          </Subheading>
          <p>
            Look up digital receipts by order. Helpful for customer service, exchanges, and
            accounting questions.
          </p>

          <Subheading>
            <Link href="/admin/workflow" className="text-primary underline">
              Workflow
            </Link>
          </Subheading>
          <p>
            Internal review queues for catalog, content, and campaign changes before they go live.
            Use it when your organization requires approvals or staged publishing.
          </p>

          <Subheading>
            <Link href="/admin/audit" className="text-primary underline">
              Audit log
            </Link>
          </Subheading>
          <p>
            A chronological record of important actions in the back office. Use it for compliance,
            troubleshooting, or verifying who changed what and when.
          </p>
        </Section>

        <Section id="roles" title="Administrators, staff, and permissions">
          <p>
            <strong className="text-primary">Administrators</strong> have full access to the back
            office. <strong className="text-primary">Staff</strong> accounts only see areas that
            were explicitly granted (for example cash register and orders, but not payroll data).
            If a screen sends you back to the overview with a short notice, your account does not
            include that permission. Ask an administrator to update your grants if your job
            requires it.
          </p>
        </Section>

        <Section id="tips" title="Tips and support">
          <BulletList
            items={[
              "Bookmark this Admin guide from the left menu whenever you onboard a new manager.",
              "Keep product names, photos, and policies aligned so customers see one clear story.",
              "After large campaigns, check Analytics and Orders together to confirm results.",
              "For technical outages, note the exact time and any on-screen message before contacting support.",
            ]}
          />
          <p className="text-on-surface-variant">
            For technical setup (servers, domains, integrations), rely on your development or IT
            partner. This guide stays focused on day-to-day use of the back office.
          </p>
        </Section>
      </div>
    </AdminPageShell>
  );
}
