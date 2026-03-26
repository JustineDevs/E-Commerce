"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";

type Row = {
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  dismissible: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export function CmsAnnouncementEditor() {
  const { data: session, status } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "content:write");
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/cms/announcement")
      .then(async (r) => {
        const j = (await r.json()) as { data?: Row | null; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data;
      })
      .then((d) => setRow(d ?? { body: "", linkUrl: null, linkLabel: null, dismissible: true, startsAt: null, endsAt: null }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load content"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!row || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/cms/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || !row) return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="max-w-xl space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <label className="block text-xs font-medium text-slate-600">
        Message
        <textarea
          className="mt-1 w-full min-h-[80px] rounded border border-slate-200 px-3 py-2 text-sm"
          value={row.body}
          onChange={(e) => setRow({ ...row, body: e.target.value })}
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Link URL
        <input
          className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          value={row.linkUrl ?? ""}
          onChange={(e) => setRow({ ...row, linkUrl: e.target.value || null })}
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Link label
        <input
          className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          value={row.linkLabel ?? ""}
          onChange={(e) => setRow({ ...row, linkLabel: e.target.value || null })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={row.dismissible}
          onChange={(e) => setRow({ ...row, dismissible: e.target.checked })}
        />
        Dismissible
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Starts at (ISO)
        <input
          className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          value={row.startsAt ?? ""}
          onChange={(e) => setRow({ ...row, startsAt: e.target.value || null })}
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Ends at (ISO)
        <input
          className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          value={row.endsAt ?? ""}
          onChange={(e) => setRow({ ...row, endsAt: e.target.value || null })}
        />
      </label>
      <button
        type="button"
        disabled={!canWrite || saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
