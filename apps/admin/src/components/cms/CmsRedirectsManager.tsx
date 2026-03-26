"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  active: boolean;
};

export function CmsRedirectsManager() {
  const { data: session, status } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "content:write");
  const [rows, setRows] = useState<Row[]>([]);
  const [fromPath, setFromPath] = useState("/old-path");
  const [toPath, setToPath] = useState("/new-path");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/cms/redirects")
      .then(async (r) => {
        const j = (await r.json()) as { data?: Row[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data ?? [];
      })
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load content"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!canWrite) return;
    setError(null);
    const r = await fetch("/api/admin/cms/redirects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_path: fromPath, to_path: toPath, status_code: 301, active: true }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      setError(j.error ?? "Failed");
      return;
    }
    load();
  };

  const remove = async (id: string) => {
    if (!canWrite || !confirm("Delete redirect?")) return;
    await fetch(`/api/admin/cms/redirects/${id}`, { method: "DELETE" });
    load();
  };

  if (status === "loading") return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs font-medium text-slate-600">
          From
          <input
            className="mt-1 block rounded border border-slate-200 px-2 py-1 text-sm"
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          To
          <input
            className="mt-1 block rounded border border-slate-200 px-2 py-1 text-sm"
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!canWrite}
          className="rounded-lg bg-primary px-3 py-2 text-sm text-white"
          onClick={() => void add()}
        >
          Add
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2">
            <span>
              <code>{r.from_path}</code> → <code>{r.to_path}</code> ({r.status_code})
            </span>
            <button type="button" className="text-red-700 text-xs underline" onClick={() => void remove(r.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
