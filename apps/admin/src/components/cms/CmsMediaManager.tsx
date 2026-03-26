"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";

type MediaRow = {
  id: string;
  public_url: string;
  alt_text: string | null;
  created_at: string;
};

export function CmsMediaManager() {
  const { data: session, status } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "content:write");
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/cms/media")
      .then(async (r) => {
        const j = (await r.json()) as { data?: MediaRow[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data ?? [];
      })
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load content"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onFile = async (f: FileList | null) => {
    if (!f?.length || !canWrite) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", f[0]);
    fd.append("alt", f[0].name);
    try {
      const r = await fetch("/api/admin/cms/media", { method: "POST", body: fd });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to upload");
    } finally {
      setUploading(false);
    }
  };

  if (status === "loading") return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <label className="block text-sm font-medium text-slate-700">
        Upload file
        <input
          type="file"
          className="mt-2 block text-sm"
          disabled={!canWrite || uploading}
          onChange={(e) => void onFile(e.target.files)}
        />
      </label>
      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map((m) => (
          <li key={m.id} className="rounded-lg border border-slate-200 p-3 text-sm break-all">
            <a href={m.public_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {m.public_url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
