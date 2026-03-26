"use client";

import Image from "next/image";
import Link from "next/link";
import maharlikaLogo from "../../../../public/Maharlika Logo Design.png";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { staffHasPermission, staffPermissionListForSession } from "@apparel-commerce/platform-data";
import { Button } from "@apparel-commerce/ui";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type AdminSidebarProps = {
  /** When false, sidebar is off-canvas on small screens (use with mobile overlay). Desktop (lg+) always visible. */
  mobileOpen?: boolean;
  /** Called after navigating (e.g. close mobile drawer). */
  onNavigate?: () => void;
  /** Opens the Cmd+K command palette (desktop quick access). */
  onOpenSearch?: () => void;
};

export function AdminSidebar({
  mobileOpen = true,
  onNavigate,
  onOpenSearch,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perms = staffPermissionListForSession(session);

  return (
    <aside
      id="admin-sidebar-nav"
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col gap-2 bg-slate-50 p-4 transition-transform duration-200 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="px-2 py-5">
        <Link
          href="/admin"
          onClick={() => onNavigate?.()}
          className="block overflow-x-auto rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Image
            src={maharlikaLogo}
            width={maharlikaLogo.width}
            height={maharlikaLogo.height}
            alt="Maharlika Clothing Custom"
            priority
            className="block h-28 w-auto max-w-none object-contain object-left"
          />
        </Link>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-400">
          Store back office
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {ADMIN_NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) =>
            staffHasPermission(perms ?? [], item.permission),
          );
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
              {visible.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className={
                      isActive
                        ? "flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-primary shadow-sm transition-all"
                        : "flex items-center gap-3 px-4 py-3 text-slate-500 transition-all hover:bg-slate-200"
                    }
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="font-body text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      {onOpenSearch ? (
        <button
          type="button"
          onClick={() => {
            onOpenSearch();
            onNavigate?.();
          }}
          className="mx-2 mb-1 flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-slate-500 transition-colors hover:bg-slate-200"
        >
          <span className="material-symbols-outlined text-xl">search</span>
          <span className="flex-1 font-body text-sm font-medium">Search pages</span>
          <kbd className="hidden rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 lg:inline-block">
            ⌘K
          </kbd>
        </button>
      ) : null}
      <div className="mt-auto flex flex-col gap-1 border-t border-slate-200 pt-4">
        <div className="mb-2 flex items-center gap-3 px-4 py-3">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-surface-container-high" />
          <div className="flex min-w-0 flex-col overflow-hidden">
            <span className="truncate text-xs font-bold text-primary">
              {session?.user?.email ?? "Staff"}
            </span>
            <span className="truncate text-[10px] capitalize text-slate-500">
              {session?.user?.role ?? "staff"}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center justify-start gap-3 px-4 py-3 text-left font-normal text-slate-500 hover:bg-slate-200"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body text-sm font-medium">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
