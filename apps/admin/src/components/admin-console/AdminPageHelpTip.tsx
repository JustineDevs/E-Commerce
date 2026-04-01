"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getAdminPageHelp } from "@/config/admin-page-help";

export type AdminPageHelpTipProps = {
  purpose: string;
  usage: string;
};

/**
 * Accessible help control: click or keyboard toggles a short panel (mobile-friendly).
 * Hover alone is unreliable on touch devices; we still show a concise native title on the button.
 */
export function AdminPageHelpTip({ purpose, usage }: AdminPageHelpTipProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        close();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const summary = purpose.length > 90 ? `${purpose.slice(0, 87)}…` : purpose;

  return (
    <div ref={wrapRef} className="relative inline-flex shrink-0 pt-1">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-surface-container-low text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-surface-container-high hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={open ? panelId : undefined}
        title={`About this page: ${summary}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          help
        </span>
        <span className="sr-only">Page overview and tips</span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Page guide"
          className="absolute left-0 top-full z-[100] mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-outline-variant/20 bg-white p-4 text-left shadow-lg"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Overview
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-on-surface">
            {purpose}
          </p>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary">
            Tips
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-on-surface-variant">
            {usage}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Help icon for pages that do not use {@link AdminPageTitleWithHelp} (e.g. POS custom header). */
export function AdminPageHelpFromPath({ path }: { path?: string }) {
  const pathname = usePathname();
  const help = getAdminPageHelp(path ?? pathname);
  if (!help) {
    return null;
  }
  return <AdminPageHelpTip purpose={help.purpose} usage={help.usage} />;
}
