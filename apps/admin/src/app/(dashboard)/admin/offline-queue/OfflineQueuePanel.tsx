"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin-console";

type QueueItem = {
  id: string;
  device_name: string;
  employee_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  error_message: string | null;
  created_at: string;
  synced_at: string | null;
};

export function OfflineQueuePanel() {
  const [device, setDevice] = useState("");
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (device.trim()) params.set("device", device.trim());
    setError(null);
    setItems(null);
    fetch(`/api/admin/offline-queue?${params.toString()}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.error) {
          setError(body.error);
          setItems([]);
          return;
        }
        setItems((body.data as QueueItem[]) ?? []);
      })
      .catch(() => {
        setError("Unable to load offline queue");
        setItems([]);
      });
  }, [device]);

  useEffect(() => {
    load();
  }, [load]);

  if (items === null && !error) {
    return <AdminLoadingState label="Loading offline queue" />;
  }

  if (error) {
    return <AdminErrorState title="Queue data unavailable" detail={error} />;
  }

  if (!items?.length) {
    return (
      <AdminEmptyState
        title="No pending offline sales"
        description="POS devices enqueue sales here when the network drops. Items clear after a successful sync."
        action={
          <button
            type="button"
            onClick={() => load()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Refresh
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4">
        <label className="block min-w-[200px] flex-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            Device filter
          </span>
          <input
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="mt-1 w-full rounded border border-outline-variant/30 px-3 py-2 text-sm"
            placeholder="Optional device name"
          />
        </label>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-outline-variant/30 bg-white px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low"
        >
          Apply
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-medium">Device</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Payload</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id}
                className="border-t border-outline-variant/15 hover:bg-surface-container-low/60"
              >
                <td className="px-4 py-3 align-top font-medium text-on-surface">
                  {row.device_name}
                </td>
                <td className="px-4 py-3 align-top text-xs text-on-surface-variant">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 align-top">
                  <pre className="max-h-40 max-w-xl overflow-auto rounded bg-surface-container-high p-2 font-mono text-[11px] text-on-surface">
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
