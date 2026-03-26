"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ReceiptPayload = {
  id: string;
  order_id: string;
  customer_email: string | null;
  receipt_html: string;
  sent_at: string | null;
  created_at: string;
};

export function DigitalReceiptLookup() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("order_id")?.trim() ?? "";
  const [orderId, setOrderId] = useState(initialOrderId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);

  const load = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) {
        setError("Enter an order number.");
        setReceipt(null);
        return;
      }
      setLoading(true);
      setError(null);
      setReceipt(null);
      try {
        const res = await fetch(
          `/api/admin/receipts?order_id=${encodeURIComponent(trimmed)}`,
        );
        const body = (await res.json()) as { error?: string; data?: ReceiptPayload };
        if (!res.ok) {
          setError(body.error ?? "Receipt unavailable");
          return;
        }
        if (body.data) {
          setReceipt(body.data);
        }
      } catch {
        setError("Network unavailable");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialOrderId) {
      void load(initialOrderId);
    }
  }, [initialOrderId, load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void load(orderId);
        }}
      >
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Order id
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-mono text-sm"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order number"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load receipt"}
        </button>
      </form>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {receipt ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant">
            {receipt.customer_email ? (
              <span>
                <span className="font-semibold text-primary">Email:</span> {receipt.customer_email}
              </span>
            ) : null}
            <span>
              <span className="font-semibold text-primary">Sent:</span>{" "}
              {receipt.sent_at ? new Date(receipt.sent_at).toLocaleString() : "Not sent"}
            </span>
            <span>
              <span className="font-semibold text-primary">Stored:</span>{" "}
              {new Date(receipt.created_at).toLocaleString()}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-outline-variant/20 bg-white shadow-sm">
            <iframe
              title="Receipt preview"
              className="h-[min(70vh,720px)] w-full border-0"
              sandbox="allow-same-origin"
              srcDoc={receipt.receipt_html}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
