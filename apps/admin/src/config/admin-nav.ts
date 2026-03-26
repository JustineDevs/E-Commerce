/**
 * Single source for sidebar and command palette (Cmd+K) navigation.
 */
export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  permission: string;
};

export const ADMIN_NAV_GROUPS: { label: string; items: readonly AdminNavItem[] }[] = [
  {
    label: "Commerce",
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard", permission: "dashboard:read" },
      {
        href: "/admin/catalog",
        label: "Products",
        icon: "shopping_bag",
        permission: "catalog:read",
      },
      { href: "/admin/inventory", label: "Inventory", icon: "inventory_2", permission: "inventory:read" },
      { href: "/admin/orders", label: "Orders", icon: "shopping_cart", permission: "orders:read" },
      { href: "/admin/pos", label: "POS", icon: "dock", permission: "pos:use" },
      {
        href: "/admin/offline-queue",
        label: "Offline queue",
        icon: "cloud_sync",
        permission: "pos:use",
      },
      { href: "/admin/crm", label: "CRM", icon: "groups", permission: "crm:read" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/employees", label: "Employees", icon: "badge", permission: "employees:read" },
      { href: "/admin/devices", label: "Devices", icon: "devices", permission: "devices:manage" },
      { href: "/admin/channels", label: "Channels", icon: "hub", permission: "channels:manage" },
      { href: "/admin/chat-orders", label: "Chat orders", icon: "chat", permission: "chat_orders:manage" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: "bar_chart", permission: "analytics:read" },
      { href: "/admin/loyalty", label: "Loyalty", icon: "loyalty", permission: "loyalty:read" },
      { href: "/admin/campaigns", label: "Campaigns", icon: "campaign", permission: "campaigns:read" },
      {
        href: "/admin/settings/storefront",
        label: "Storefront home",
        icon: "web",
        permission: "settings:read",
      },
      {
        href: "/admin/cms",
        label: "Content",
        icon: "article",
        permission: "content:read",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/docs", label: "Admin guide", icon: "menu_book", permission: "dashboard:read" },
      {
        href: "/admin/settings/preferences",
        label: "Preferences",
        icon: "tune",
        permission: "settings:read",
      },
      {
        href: "/admin/settings/payments",
        label: "Payments",
        icon: "payments",
        permission: "settings:read",
      },
      {
        href: "/admin/receipts",
        label: "Receipts",
        icon: "receipt_long",
        permission: "receipts:read",
      },
      {
        href: "/admin/workflow",
        label: "Workflow",
        icon: "account_tree",
        permission: "dashboard:read",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: "fact_check",
        permission: "dashboard:read",
      },
    ],
  },
];

/** CMS sub-routes shown in Cmd+K for faster jumps (same permissions as Content hub). */
export const ADMIN_COMMAND_CMS_GROUPS: { label: string; items: readonly AdminNavItem[] }[] = [
  {
    label: "Content (website)",
    items: [
      { href: "/admin/cms/pages", label: "Pages", icon: "article", permission: "content:read" },
      {
        href: "/admin/cms/navigation",
        label: "Navigation and footer",
        icon: "menu",
        permission: "content:read",
      },
      {
        href: "/admin/cms/announcement",
        label: "Announcement bar",
        icon: "campaign",
        permission: "content:read",
      },
      {
        href: "/admin/cms/categories",
        label: "Category pages",
        icon: "category",
        permission: "content:read",
      },
      { href: "/admin/cms/media", label: "Media library", icon: "perm_media", permission: "content:read" },
      { href: "/admin/cms/blog", label: "Blog", icon: "rss_feed", permission: "content:read" },
      {
        href: "/admin/cms/forms",
        label: "Form submissions",
        icon: "inbox",
        permission: "content:read",
      },
      { href: "/admin/cms/redirects", label: "Redirects", icon: "swap_calls", permission: "content:read" },
      { href: "/admin/cms/experiments", label: "Page tests", icon: "science", permission: "content:read" },
      {
        href: "/admin/cms/commerce",
        label: "Product lookup",
        icon: "search",
        permission: "content:read",
      },
    ],
  },
];
