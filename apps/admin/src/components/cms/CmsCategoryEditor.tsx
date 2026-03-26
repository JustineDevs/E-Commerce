"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  collection_handle: string;
  locale: string;
  intro_html: string;
  banner_url: string | null;
  blocks: unknown;
};

export function CmsCategoryEditor() {
  const { data: session, status } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "content:write");
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [blocksJson, setBlocksJson] = useState("[]");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/cms/category-content")
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

  useEffect(() => {
    if (!editing) return;
    setBlocksJson(JSON.stringify(editing.blocks ?? [], null, 2));
  }, [editing]);

  const save = async () => {
    if (!editing || !canWrite) return;
    let blocks: unknown = [];
    try {
      blocks = JSON.parse(blocksJson) as unknown;
    } catch {
      setError("Blocks JSON invalid");
      return;
    }
    setError(null);
    const r = await fetch("/api/admin/cms/category-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id || undefined,
        collection_handle: editing.collection_handle,
        locale: editing.locale,
        intro_html: editing.intro_html,
        banner_url: editing.banner_url,
        blocks,
      }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      setError(j.error ?? "Unable to save");
      return;
    }
    setEditing(null);
    load();
  };

  if (status === "loading") return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="font-headline text-lg font-bold text-primary mb-3">Rows</h3>
        <p className="text-xs text-slate-600 mb-2">Handle must match shop category filter (e.g. Shorts, Shirt, Jacket).</p>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" className="text-sm underline" onClick={() => setEditing(r)}>
                {r.collection_handle} ({r.locale})
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          onClick={() =>
            setEditing({
              id: "",
              collection_handle: "Shorts",
              locale: "en",
              intro_html: "",
              banner_url: null,
              blocks: [],
            })
          }
        >
          New row
        </button>
      </div>
      {editing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Collection handle
            <input
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={editing.collection_handle}
              onChange={(e) => setEditing({ ...editing, collection_handle: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Intro HTML
            <textarea
              className="mt-1 w-full min-h-[100px] rounded border border-slate-200 px-3 py-2 text-sm font-mono"
              value={editing.intro_html}
              onChange={(e) => setEditing({ ...editing, intro_html: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Banner URL
            <input
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={editing.banner_url ?? ""}
              onChange={(e) => setEditing({ ...editing, banner_url: e.target.value || null })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Blocks JSON
            <textarea
              className="mt-1 w-full min-h-[120px] rounded border border-slate-200 px-3 py-2 text-sm font-mono"
              value={blocksJson}
              onChange={(e) => setBlocksJson(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="button"
            disabled={!canWrite}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void save()}
          >
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}
