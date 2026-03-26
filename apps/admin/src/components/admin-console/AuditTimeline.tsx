"use client";

import { useEffect, useState } from "react";

export type AuditEntry = {
  id: string;
  action: string;
  resource: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export function AuditTimeline({
  resourcePrefix,
  title = "Activity",
  className = "",
}: {
  /** e.g. `product:` to match audit resource */
  resourcePrefix?: string;
  title?: string;
  className?: string;
}) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: "20" });
    if (resourcePrefix) params.set("resource_prefix", resourcePrefix);
    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as {
          error?: string;
          entries?: AuditEntry[];
        };
        if (cancelled) return;
        if (!r.ok) {
          setError(
            r.status === 403
              ? "Activity feed is not available for your role."
              : (body.error ?? "Activity feed unavailable"),
          );
          setEntries([]);
          return;
        }
        if (body.error) {
          setError(body.error);
          setEntries([]);
          return;
        }
        setEntries(body.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Activity feed unavailable");
          setEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resourcePrefix]);

  return (
    <div className={`rounded-lg border border-outline-variant/15 bg-white p-4 shadow-sm ${className}`}>
      <h3 className="font-headline text-sm font-bold tracking-tight text-primary">{title}</h3>
      {error ? (
        <p className="mt-1 text-xs text-on-surface-variant">{error}</p>
      ) : null}
      {entries === null ? (
        <p className="mt-3 text-xs text-on-surface-variant">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-xs text-on-surface-variant">No activity yet.</p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto text-xs">
          {entries.map((e) => (
            <li key={e.id} className="border-b border-outline-variant/10 pb-2 last:border-0">
              <p className="font-medium text-primary">{e.action}</p>
              {e.resource ? (
                <p className="text-on-surface-variant">{e.resource}</p>
              ) : null}
              <p className="text-[10px] text-on-surface-variant/80">
                {new Date(e.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
