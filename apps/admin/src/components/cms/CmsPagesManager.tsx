"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";

type CmsPageRow = {
  id: string;
  slug: string;
  locale: string;
  page_type: string;
  title: string;
  body: string;
  blocks: unknown;
  status: string;
  published_at: string | null;
  scheduled_publish_at: string | null;
  preview_token: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  json_ld: unknown | null;
};

export function CmsPagesManager() {
  const { data: session, status } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "content:write");
  const [rows, setRows] = useState<CmsPageRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CmsPageRow | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [blocksJson, setBlocksJson] = useState("[]");
  const [jsonLdText, setJsonLdText] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/cms/pages")
      .then(async (r) => {
        const j = (await r.json()) as { data?: CmsPageRow[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data ?? [];
      })
      .then(setRows)
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Unable to load content");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editing) return;
    setBlocksJson(JSON.stringify(editing.blocks ?? [], null, 2));
    setJsonLdText(
      editing.json_ld != null ? JSON.stringify(editing.json_ld, null, 2) : "",
    );
  }, [editing]);

  const save = async () => {
    if (!editing || !canWrite) return;
    setSaving(true);
    setSaveError(null);
    let blocks: unknown = [];
    try {
      blocks = JSON.parse(blocksJson) as unknown;
    } catch {
      setSaveError("Blocks must be valid JSON array");
      setSaving(false);
      return;
    }
    let json_ld: unknown | null = null;
    if (jsonLdText.trim()) {
      try {
        json_ld = JSON.parse(jsonLdText) as unknown;
      } catch {
        setSaveError("JSON-LD must be valid JSON");
        setSaving(false);
        return;
      }
    }
    const payload: Record<string, unknown> = {
      slug: editing.slug,
      locale: editing.locale,
      page_type: editing.page_type,
      title: editing.title,
      body: editing.body,
      blocks,
      status: editing.status,
      published_at: editing.published_at,
      scheduled_publish_at: editing.scheduled_publish_at,
      preview_token: editing.preview_token,
      meta_title: editing.meta_title,
      meta_description: editing.meta_description,
      canonical_url: editing.canonical_url,
      og_image_url: editing.og_image_url,
      json_ld,
    };
    if (editing.id.trim()) payload.id = editing.id;
    const method = editing.id.trim() ? "PUT" : "POST";
    const url = editing.id.trim() ? `/api/admin/cms/pages/${editing.id}` : "/api/admin/cms/pages";
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { data?: CmsPageRow; error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      if (j.data) setEditing(j.data);
      load();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!canWrite || !confirm("Delete this page?")) return;
    const r = await fetch(`/api/admin/cms/pages/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      setSaveError(j.error ?? "Unable to delete");
      return;
    }
    setEditing(null);
    load();
  };

  if (status === "loading") {
    return <p className="text-sm text-slate-600">Loading session…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          onClick={() =>
            setEditing({
              id: "",
              slug: "new-page",
              locale: "en",
              page_type: "static",
              title: "New page",
              body: "<p></p>",
              blocks: [],
              status: "draft",
              published_at: null,
              scheduled_publish_at: null,
              preview_token: null,
              meta_title: null,
              meta_description: null,
              canonical_url: null,
              og_image_url: null,
              json_ld: null,
            })
          }
        >
          New page
        </button>
      </div>
      {loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}
      {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-headline text-lg font-bold text-primary mb-3">All pages</h3>
          <ul className="space-y-2">
            {rows.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="text-left text-sm text-slate-800 underline"
                  onClick={() => setEditing(p)}
                >
                  {p.slug} ({p.status})
                </button>
              </li>
            ))}
          </ul>
        </div>

        {editing ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-headline text-lg font-bold text-primary">Edit</h3>
            <label className="block text-xs font-medium text-slate-600">
              Slug
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Title
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Body (HTML)
              <textarea
                className="mt-1 w-full min-h-[120px] rounded border border-slate-200 px-3 py-2 text-sm font-mono"
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Blocks (JSON array)
              <textarea
                className="mt-1 w-full min-h-[160px] rounded border border-slate-200 px-3 py-2 text-sm font-mono"
                value={blocksJson}
                onChange={(e) => setBlocksJson(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Status
              <select
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="scheduled">scheduled</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Preview token (UUID)
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono"
                value={editing.preview_token ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    preview_token: e.target.value.trim() || null,
                  })
                }
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Meta title
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.meta_title ?? ""}
                onChange={(e) => setEditing({ ...editing, meta_title: e.target.value || null })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Meta description
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.meta_description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, meta_description: e.target.value || null })
                }
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Canonical URL
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.canonical_url ?? ""}
                onChange={(e) => setEditing({ ...editing, canonical_url: e.target.value || null })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              OG image URL
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.og_image_url ?? ""}
                onChange={(e) => setEditing({ ...editing, og_image_url: e.target.value || null })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              JSON-LD (optional)
              <textarea
                className="mt-1 w-full min-h-[100px] rounded border border-slate-200 px-3 py-2 text-sm font-mono"
                value={jsonLdText}
                onChange={(e) => setJsonLdText(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={!canWrite || saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {editing.id ? (
                <button
                  type="button"
                  disabled={!canWrite}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700"
                  onClick={() => void remove(editing.id)}
                >
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                onClick={() => setEditing(null)}
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Public URL: <code>/p/{editing.slug || "slug"}</code>. Preview:{" "}
              <code>
                /api/cms/preview?slug={editing.slug}&token=TOKEN&kind=page
              </code>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
