import type { ReactNode } from "react";
import { Separator } from "@apparel-commerce/ui";
import { CollapsibleInspectorColumn } from "./CollapsibleInspectorColumn";
import { AdminPageTitleWithHelp } from "./AdminPageTitleWithHelp";

export type AdminPageShellProps = {
  /** Omit when the page provides its own hero (e.g. POS). */
  title?: string;
  subtitle?: string;
  /** Skip default title block; still renders filters and canvas. */
  hideHeader?: boolean;
  /** Thin top row (global actions, context) */
  commandBar?: ReactNode;
  /** Breadcrumbs or secondary wayfinding */
  breadcrumbs?: ReactNode;
  /** Permission denied, commerce banners, etc. */
  bannerSlot?: ReactNode;
  /** Search, filters, tabs */
  filters?: ReactNode;
  /** Primary header actions (buttons) */
  actions?: ReactNode;
  /** Main workspace */
  children: ReactNode;
  /** Right-side inspector (desktop column; mobile stacks below) */
  inspector?: ReactNode;
  /**
   * When set with `inspector`, wraps the inspector in a hide/show column with persisted preference.
   */
  inspectorCollapsible?: {
    storageKey: string;
    expandLabel?: string;
    collapseLabel?: string;
  };
  /** Sticky bottom strip: toast region, last audit line */
  footNote?: ReactNode;
  className?: string;
};

/**
 * Shared layout contract for every admin route: command bar, header, filters, canvas, optional inspector, foot strip.
 */
export function AdminPageShell({
  title,
  subtitle,
  hideHeader,
  commandBar,
  breadcrumbs,
  bannerSlot,
  filters,
  actions,
  children,
  inspector,
  inspectorCollapsible,
  footNote,
  className = "",
}: AdminPageShellProps) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-[color-mix(in_srgb,var(--surface-container-lowest)_88%,transparent)] ${className}`}
    >
      {commandBar ? (
        <div className="border-b border-outline-variant/15 bg-white/80 px-4 py-2 lg:px-8">
          {commandBar}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col px-6 py-6 lg:px-10 lg:py-8">
        {breadcrumbs ? (
          <div className="mb-4 space-y-3 text-sm text-on-surface-variant">
            {breadcrumbs}
            <Separator className="bg-outline-variant/20" />
          </div>
        ) : null}
        {bannerSlot ? <div className="mb-6 space-y-4">{bannerSlot}</div> : null}

        {!hideHeader && (title || subtitle || actions) ? (
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {title ? <AdminPageTitleWithHelp title={title} /> : null}
              {subtitle ? (
                <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-on-surface-variant">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {actions}
              </div>
            ) : null}
          </header>
        ) : null}

        {filters ? <div className="mb-6">{filters}</div> : null}

        <div className="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row">
          <div className="min-w-0 flex-1">{children}</div>
          {inspector ? (
            inspectorCollapsible ? (
              <CollapsibleInspectorColumn
                storageKey={inspectorCollapsible.storageKey}
                expandLabel={inspectorCollapsible.expandLabel}
                collapseLabel={inspectorCollapsible.collapseLabel}
              >
                {inspector}
              </CollapsibleInspectorColumn>
            ) : (
              <div className="w-full shrink-0 border-t border-outline-variant/15 pt-6 xl:w-96 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                {inspector}
              </div>
            )
          ) : null}
        </div>
      </div>

      {footNote ? (
        <div className="sticky bottom-0 z-10 border-t border-outline-variant/20 bg-white/95 px-4 py-3 text-sm shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur-sm lg:px-10">
          {footNote}
        </div>
      ) : null}
    </div>
  );
}
