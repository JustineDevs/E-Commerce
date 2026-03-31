import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminBreadcrumbs, AdminPageShell } from "@/components/admin-console";
import { ADMIN_COMMAND_CMS_GROUPS, ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import { isEmailAllowedForGuideDemos } from "@/lib/admin-allowed-emails";
import { authOptions } from "@/lib/auth";
import { GUIDE_DEMO_CATALOG } from "@/lib/guide-demos-catalog";
import { requirePagePermission } from "@/lib/require-page-permission";
import { getServerSession } from "next-auth/next";

export const metadata: Metadata = {
  title: "Admin guide",
  description:
    "Staff admin guide: sidebar navigation, daily tasks, commerce versus website content, and permissions.",
};

const tocBase = [
  { href: "#welcome", label: "Overview" },
  { href: "#ownership", label: "Who owns what" },
  { href: "#sidebar", label: "How to use the sidebar" },
  { href: "#navigation-map", label: "Where do I go?" },
  { href: "#daily-tasks", label: "Daily tasks" },
  { href: "#advanced", label: "Advanced operations" },
  { href: "#interactive-demos", label: "Interactive demos" },
  { href: "#important-notes", label: "Important notes" },
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

export default async function AdminDocsPage() {
  await requirePagePermission("dashboard:read");
  const session = await getServerSession(authOptions);
  const canAccessGuideDemos = isEmailAllowedForGuideDemos(session?.user?.email ?? null);
  const toc = canAccessGuideDemos
    ? tocBase
    : tocBase.filter((item) => item.href !== "#interactive-demos");

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
      subtitle="Operator guide for owners and managers: where to go for each task, what the commerce system owns versus website content, and how permissions shape the menu."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Admin guide" }]}
        />
      }
      inspector={tocNav}
    >
      <div className="mx-auto max-w-3xl space-y-14 pb-16">
        <Section id="welcome" title="Overview">
          <p>
            <strong className="text-primary">Staff admin console.</strong> Use this area for
            day-to-day operations: catalog, inventory, orders, POS, analytics, customers, team
            tools, settings, and website content.
          </p>
          <div
            className="mt-6 rounded-xl border border-amber-500/35 bg-amber-500/10 p-5 text-on-surface"
            role="note"
          >
            <p className="font-semibold text-primary">Catalog and prices stay in the commerce system</p>
            <p className="mt-2 text-on-surface-variant">
              Homepage and editorial content are handled in the admin CMS and storefront-home
              surfaces. Do not treat the CMS as the source of truth for pricing, stock counts, or
              product records.
            </p>
          </div>
        </Section>

        <Section id="ownership" title="Who owns what">
          <p>
            Some data lives in the <strong className="text-primary">commerce engine</strong> (your
            store&apos;s product catalog, prices, orders, inventory positions, regions, and payment
            provider configuration at checkout). That is the system of record for selling.
          </p>
          <p className="mt-4">
            Other data lives in <strong className="text-primary">platform tools</strong> connected
            to this admin: staff sign-in and permissions, CMS copy and media, loyalty programs,
            employee records, devices, campaigns, the storefront homepage payload, channel events,
            and chat or intake archives. Those tools do not replace commerce records for products or
            orders.
          </p>
        </Section>

        <Section id="sidebar" title="How to use the sidebar">
          <p>
            <strong className="text-primary">Use the left sidebar to move by task.</strong> The
            sidebar is the main navigation of the admin, and it only shows areas your role is
            allowed to access.
          </p>
          <p className="mt-4">
            Press <strong className="text-primary">Ctrl+K</strong> (Windows) or{" "}
            <strong className="text-primary">Cmd+K</strong> (Mac), or use{" "}
            <strong className="text-primary">Search pages</strong> in the sidebar, to jump to any
            screen by name.
          </p>
          <Subheading>Sidebar reference (matches the live menu)</Subheading>
          <div className="space-y-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest/80 p-5">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {group.label}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="navigation-map" title="Where do I go?">
          <p>
            Use the table below by <strong className="text-primary">business intent</strong>. Links
            match the real sidebar; group names below are for learning, not separate menus.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-outline-variant/20">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-lowest">
                  <th className="px-4 py-3 font-headline text-xs font-bold uppercase tracking-wider text-primary">
                    Group
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold uppercase tracking-wider text-primary">
                    What belongs here
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold uppercase tracking-wider text-primary">
                    Business explanation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                <tr>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">Commerce</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <Link href="/admin" className="text-primary underline">
                      Dashboard
                    </Link>
                    ,{" "}
                    <Link href="/admin/catalog" className="text-primary underline">
                      Products
                    </Link>
                    ,{" "}
                    <Link href="/admin/inventory" className="text-primary underline">
                      Inventory
                    </Link>
                    ,{" "}
                    <Link href="/admin/orders" className="text-primary underline">
                      Orders
                    </Link>
                    ,{" "}
                    <Link href="/admin/pos" className="text-primary underline">
                      POS
                    </Link>
                    ,{" "}
                    <Link href="/admin/analytics" className="text-primary underline">
                      Analytics
                    </Link>
                    ,{" "}
                    <Link href="/admin/crm" className="text-primary underline">
                      CRM
                    </Link>
                    ,{" "}
                    <Link href="/admin/settings/payments" className="text-primary underline">
                      Payments
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    Monitor sales, manage the catalog, check stock, review orders, run in-store sales,
                    read business metrics, view customers, and inspect payment and region setup.
                  </td>
                </tr>
                <tr>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">
                    Team and growth
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <Link href="/admin/employees" className="text-primary underline">
                      Employees
                    </Link>
                    ,{" "}
                    <Link href="/admin/loyalty" className="text-primary underline">
                      Loyalty
                    </Link>
                    ,{" "}
                    <Link href="/admin/campaigns" className="text-primary underline">
                      Campaigns
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    Staff records and access, customer rewards, and marketing execution.
                  </td>
                </tr>
                <tr>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">Operations</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <Link href="/admin/devices" className="text-primary underline">
                      Devices
                    </Link>
                    ,{" "}
                    <Link href="/admin/channels" className="text-primary underline">
                      Channels
                    </Link>
                    ,{" "}
                    <Link href="/admin/chat-orders" className="text-primary underline">
                      Chat orders
                    </Link>
                    ,{" "}
                    <Link href="/admin/offline-queue" className="text-primary underline">
                      Offline queue
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    Register hardware, review channel events, process chat or manual intake, and clear
                    POS sync when the network was down.
                  </td>
                </tr>
                <tr>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">Website</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <Link href="/admin/settings/storefront" className="text-primary underline">
                      Storefront home
                    </Link>
                    ,{" "}
                    <Link href="/admin/cms" className="text-primary underline">
                      Content
                    </Link>
                    ,{" "}
                    <Link href="/admin/reviews" className="text-primary underline">
                      Reviews
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    Homepage payload, CMS sections (pages, navigation, announcement bar, categories,
                    media, blog, forms, redirects, experiments, product lookup for authors), and
                    review moderation.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <Subheading>For catalog and order operations, think commerce first</Subheading>
          <p>
            Products, prices, orders, inventory, and payment-region setup are tied to the commerce
            system rather than the CMS layer.
          </p>
          <Subheading>For website updates, think content first</Subheading>
          <p>
            Homepage payload and CMS sections such as pages, navigation, announcements, blog, media,
            forms, redirects, and experiments are managed in the content side of admin.
          </p>
        </Section>

        <Section id="daily-tasks" title="Daily tasks">
          <Subheading>Most common tasks</Subheading>
          <ol className="list-decimal space-y-3 pl-5 text-on-surface-variant">
            <li>
              <strong className="text-on-surface">Check today&apos;s performance:</strong> open{" "}
              <Link href="/admin" className="text-primary underline">
                Dashboard
              </Link>{" "}
              for overview metrics, recent orders, and stock alerts.
            </li>
            <li>
              <strong className="text-on-surface">Review or fulfill an order:</strong> open{" "}
              <Link href="/admin/orders" className="text-primary underline">
                Orders
              </Link>
              , then select an order to view details and fulfillment actions.
            </li>
            <li>
              <strong className="text-on-surface">Update stock visibility:</strong> open{" "}
              <Link href="/admin/inventory" className="text-primary underline">
                Inventory
              </Link>{" "}
              and refresh the latest variant stock data.
            </li>
            <li>
              <strong className="text-on-surface">Sell in person:</strong> open{" "}
              <Link href="/admin/pos" className="text-primary underline">
                POS
              </Link>{" "}
              for lookup, cart, draft order, and sale completion flows.
            </li>
            <li>
              <strong className="text-on-surface">Update homepage content:</strong> open{" "}
              <Link href="/admin/settings/storefront" className="text-primary underline">
                Storefront home
              </Link>{" "}
              for the homepage payload editor.
            </li>
            <li>
              <strong className="text-on-surface">Edit website content:</strong> open{" "}
              <Link href="/admin/cms" className="text-primary underline">
                Content
              </Link>{" "}
              for pages, menus, announcement bar, categories, media, blog, forms, redirects,
              experiments, and commerce lookup for authors.
            </li>
          </ol>
        </Section>

        <Section id="advanced" title="Advanced operations">
          <Subheading>POS</Subheading>
          <p>
            The POS area supports lookup, cart building, draft order flow, sale commit, suggestions,
            offline queue behavior, and optional terminal printing paths.
          </p>
          <Subheading>Orders</Subheading>
          <p>
            The orders area includes list and detail views; the detail page includes fulfillment
            actions and shipment-related tools.
          </p>
          <Subheading>Inventory</Subheading>
          <p>
            The inventory page is focused on variant-level stock visibility with refresh support
            from server-side data.
          </p>
          <Subheading>Products</Subheading>
          <p>
            The products list is commerce-backed and links to the commerce product editor. A native
            add-product path exists in admin; full end-to-end wiring for every catalog scenario may
            still be evolving, so confirm critical launches with your operations lead.
          </p>
          <Subheading>Content hub sections</Subheading>
          <ul className="mt-2 space-y-2 text-on-surface-variant">
            {ADMIN_COMMAND_CMS_GROUPS.flatMap((g) =>
              g.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-medium text-primary underline decoration-primary/30 underline-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              )),
            )}
          </ul>
          {canAccessGuideDemos ? (
            <>
              <Subheading>Training demos</Subheading>
              <p>
                Open the{" "}
                <Link
                  href="/guide-demos/index.html"
                  className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
                >
                  demo index
                </Link>{" "}
                for static HTML simulators: fake browser chrome, sidebar that matches this admin, mock
                data only, requestAnimationFrame cursor paths, captions, optional Web Speech, pause,
                skip, speed, and presentation or manual stepping. Access requires your email in{" "}
                <code className="rounded bg-surface-container px-1 py-0.5 text-xs">ADMIN_ALLOWED_EMAILS</code>
                .
              </p>
            </>
          ) : (
            <>
              <Subheading>Training demos</Subheading>
              <p className="text-on-surface-variant">
                Interactive HTML demos are limited to addresses configured in{" "}
                <code className="rounded bg-surface-container px-1 py-0.5 text-xs">ADMIN_ALLOWED_EMAILS</code>
                . Ask your administrator if you need access.
              </p>
            </>
          )}
        </Section>

        {canAccessGuideDemos ? (
          <Section id="interactive-demos" title="Interactive demos (safe simulator)">
            <p>
              Each link opens a new tab. Demos are deterministic and offline friendly. They explain how
              staff work in admin while commerce truth stays in your commerce engine and customer-facing
              pages reflect content and storefront settings separately.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {GUIDE_DEMO_CATALOG.map((d) => (
                <a
                  key={d.key}
                  href={`/guide-demos/${d.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-outline-variant/25 bg-surface-container-lowest/90 p-4 shadow-sm transition hover:border-primary/40"
                >
                  <p className="font-headline text-sm font-bold text-primary">{d.title}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface">Audience:</span> {d.audience}
                  </p>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface">Outcome:</span> {d.outcome}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{d.summary}</p>
                </a>
              ))}
            </div>
          </Section>
        ) : null}

        <Section id="important-notes" title="Important notes">
          <div
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-on-surface"
            role="alert"
          >
            <p className="font-semibold text-primary">Permissions and changing features</p>
            <p className="mt-2 text-on-surface-variant">
              Not every staff member sees every menu. The sidebar is permission-filtered, and many
              areas depend on role-based access from the staff session. Some screens are read-focused,
              others are operational. Product edit flows may still be transitional in places,
              including the native create or edit catalog path, so coordinate with your administrator
              when you need a change that does not appear in your menu.
            </p>
          </div>
          <p className="mt-6 text-on-surface-variant">
            For technical setup (servers, domains, integrations), rely on your development or IT
            partner. This guide stays focused on day-to-day use of the back office.
          </p>
        </Section>
      </div>
    </AdminPageShell>
  );
}
