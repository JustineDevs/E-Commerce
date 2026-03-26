"use client";

import type { ReactNode } from "react";

export type EntityActionBarButton = {
  key: string;
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export type EntityActionBarProps = {
  actions: EntityActionBarButton[];
  trailing?: ReactNode;
};

const btnBase =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50";

export function EntityActionBar({ actions, trailing }: EntityActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/15 pt-4">
      {actions.map((a) => {
        const cls =
          a.variant === "danger"
            ? `${btnBase} bg-red-600 text-white hover:bg-red-700`
            : a.variant === "primary"
              ? `${btnBase} bg-primary text-white hover:opacity-95`
              : `${btnBase} border border-outline-variant/30 bg-white text-primary hover:bg-surface-container-low`;
        if (a.href) {
          return (
            <a key={a.key} href={a.href} className={cls}>
              {a.label}
            </a>
          );
        }
        return (
          <button
            key={a.key}
            type="button"
            className={cls}
            onClick={a.onClick}
            disabled={a.disabled}
          >
            {a.label}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
