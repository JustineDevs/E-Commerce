"use client";

import type { CmsNavLink } from "@apparel-commerce/platform-data";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; testId?: string };

const DEFAULT_ITEMS: Item[] = [
  { href: "/shop", label: "Shop", testId: "nav-shop" },
  { href: "/collections", label: "Collections" },
  { href: "/", label: "About" },
];

export function StorefrontMainNav({ items }: { items?: CmsNavLink[] }) {
  const pathname = usePathname() ?? "";
  const ITEMS: Item[] =
    items && items.length > 0
      ? items.map((i) => ({ href: i.href, label: i.label }))
      : DEFAULT_ITEMS;

  return (
    <div className="flex min-w-0 max-w-[min(100%,14rem)] flex-1 items-center justify-center gap-3 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:flex-none sm:justify-center sm:gap-6 md:gap-10 lg:gap-12 [&::-webkit-scrollbar]:hidden">
      {ITEMS.map(({ href, label, testId }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            data-testid={testId}
            className={
              active
                ? "shrink-0 border-b-2 border-primary pb-0.5 text-[11px] font-semibold text-primary transition-colors xs:text-xs sm:text-sm"
                : "shrink-0 text-[11px] font-medium text-on-surface-variant transition-colors hover:text-primary xs:text-xs sm:text-sm"
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
