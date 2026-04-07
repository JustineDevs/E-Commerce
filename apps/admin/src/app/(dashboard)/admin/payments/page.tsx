"use client";

import { useCallback, useEffect, useState } from "react";

type AttemptRow = {
  correlationId: string;
  cartId: string;
  provider: string;
  status: string;
  checkoutState: string;
  medusaOrderId: string | null;
  quoteFingerprint: string | null;
  staleReason: string | null;
  invalidatedAt: string | null;
  invalidatedBy: string | null;
  lastError: string | null;
  finalizeAttempts: number;
  updatedAt: string;
};

function statusTone(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "expired" || status === "needs_review") {
    return "bg-amber-100 text-amber-900";
  }
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/payments?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.attempts)) {
          setRows(d.attempts);
          setError(null);
        } else if (typeof d.error === "string") {
          setError(d.error);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function retryFinalization(correlationId: string) {
    setBusy(correlationId);
    try {
      const r = await fetch(
        `/api/admin/payments/${encodeURIComponent(correlationId)}/retry`,
        { method: "POST" },
      );
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Retry failed");
      } else {
        load();
      }
    } finally {
      setBusy(null);
    }
  }

  async function markReview(correlationId: string) {
    setBusy(correlationId);
    try {
      const r = await fetch(
        `/api/admin/payments/${encodeURIComponent(correlationId)}/mark-review`,
        { method: "POST" },
      );
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Update failed");
      } else {
        load();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Payment attempts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Supabase ledger rows used for hosted checkout recovery and COD. Retry calls the storefront finalizer using{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">STOREFRONT_ORIGIN</code> and{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">STOREFRONT_INTERNAL_RECONCILE_SECRET</code>.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-gray-500 text-sm">Loading…</p> : null}

      {!loading && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700">Provider</th>
                <th className="text-left p-3 font-medium text-gray-700">Status</th>
                <th className="text-left p-3 font-medium text-gray-700">Stale / review reason</th>
                <th className="text-left p-3 font-medium text-gray-700">Order</th>
                <th className="text-left p-3 font-medium text-gray-700">Quote</th>
                <th className="text-left p-3 font-medium text-gray-700">Finalize #</th>
                <th className="text-left p-3 font-medium text-gray-700">Updated</th>
                <th className="text-left p-3 font-medium text-gray-700">Correlation</th>
                <th className="text-right p-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.correlationId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{row.provider}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone(row.status)}`}
                    >
                      {row.status}
                    </span>
                    <div className="text-xs text-gray-400">{row.checkoutState}</div>
                  </td>
                  <td className="p-3 max-w-[260px]">
                    <p className="text-xs text-gray-700">
                      {row.staleReason ?? row.lastError ?? "—"}
                    </p>
                    {row.invalidatedAt ? (
                      <p className="mt-1 text-[11px] text-gray-400">
                        Invalidated {new Date(row.invalidatedAt).toLocaleString()}
                        {row.invalidatedBy ? ` by ${row.invalidatedBy}` : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-3 font-mono text-xs">{row.medusaOrderId ?? "—"}</td>
                  <td className="p-3 font-mono text-[11px] text-gray-600 break-all max-w-[180px]">
                    {row.quoteFingerprint ?? "legacy-row"}
                  </td>
                  <td className="p-3">{row.finalizeAttempts}</td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-xs break-all max-w-[180px]">
                    {row.correlationId}
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      disabled={
                        busy === row.correlationId || row.status === "completed"
                      }
                      onClick={() => void retryFinalization(row.correlationId)}
                    >
                      Retry finalize
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-600 hover:underline disabled:opacity-50"
                      disabled={busy === row.correlationId}
                      onClick={() => void markReview(row.correlationId)}
                    >
                      Needs review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">No payment attempts yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
