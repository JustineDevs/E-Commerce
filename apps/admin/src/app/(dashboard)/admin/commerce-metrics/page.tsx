"use client";

import { useCallback, useEffect, useState } from "react";

type Bucket = { day: string; count: number };

export default function CommerceMetricsPage() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/commerce-recovery-metrics?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.buckets)) {
          setBuckets(d.buckets);
          setTotal(
            typeof d.totalInvalidationsInWindow === "number"
              ? d.totalInvalidationsInWindow
              : null,
          );
          setError(null);
        } else if (typeof d.error === "string") {
          setError(d.error);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Commerce recovery</h1>
        <p className="mt-1 text-sm text-slate-600">
          Stale-session signals from payment attempts with{" "}
          <code className="rounded bg-slate-100 px-1">invalidated_at</code> set (catalog or
          quote invalidation). Use with storefront observability events for full funnel
          analysis.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span>Window (days)</span>
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
          </select>
        </label>
        <button
          type="button"
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
          onClick={() => load()}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : (
        <>
          {total != null && (
            <p className="text-sm text-slate-700">
              Total invalidations in window:{" "}
              <span className="font-semibold tabular-nums">{total}</span>
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Day (UTC)</th>
                  <th className="px-4 py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {buckets.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-slate-500" colSpan={2}>
                      No invalidations in this window.
                    </td>
                  </tr>
                ) : (
                  buckets.map((b) => (
                    <tr key={b.day} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-mono text-slate-800">{b.day}</td>
                      <td className="px-4 py-2 tabular-nums">{b.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
