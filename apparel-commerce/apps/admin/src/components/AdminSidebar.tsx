"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/inventory", label: "Inventory", icon: "inventory_2" },
  { href: "/admin/orders", label: "Orders", icon: "shopping_cart" },
  { href: "/admin/pos", label: "POS", icon: "dock" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 flex flex-col p-4 gap-2 z-50">
      <div className="px-4 py-6">
        <h1 className="text-lg font-black tracking-widest uppercase text-primary font-headline">
          Maharlika
        </h1>
        <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-1">
          Admin Console
        </p>
      </div>
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "bg-white text-primary rounded-lg shadow-sm px-4 py-3 flex items-center gap-3 transition-all"
                  : "text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200 transition-all"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body text-sm font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-slate-200 pt-4">
        <div className="px-4 py-3 flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-primary truncate">
              Admin User
            </span>
            <span className="text-[10px] text-slate-500 truncate">
              Store Manager
            </span>
          </div>
        </div>
        <Link
          href="#"
          className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200 transition-all"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-body text-sm font-medium">Settings</span>
        </Link>
        <Link
          href="#"
          className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200 transition-all"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body text-sm font-medium">Logout</span>
        </Link>
      </div>
    </aside>
  );
}
