"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";

type NavPayload = {
  headerLinks: { href: string; label: string }[];
  footerColumns: { title: string; links: { href: string; label: string }[] }[];
  socialLinks: { href: string; label: string }[];
};

export function CmsNavigationEditor() {
  const { data: session, status } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "content:write");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/cms/navigation")
      .then(async (r) => {
        const j = (await r.json()) as { data?: NavPayload; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data;
      })
      .then((d) => {
        if (d) setJsonText(JSON.stringify(d, null, 2));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load content"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const parsed = JSON.parse(jsonText) as NavPayload;
      const r = await fetch("/api/admin/cms/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid JSON, or save did not complete");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="space-y-4 max-w-4xl">
      <p className="text-sm text-slate-600">
        Shape: <code className="text-xs">headerLinks</code>, <code className="text-xs">footerColumns</code>,{" "}
        <code className="text-xs">socialLinks</code>.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">Saved.</p> : null}
      <textarea
        className="w-full min-h-[320px] rounded-lg border border-slate-200 p-4 font-mono text-sm"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
      />
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
