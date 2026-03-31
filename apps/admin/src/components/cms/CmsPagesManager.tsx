"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";
import type { CmsBlock } from "@apparel-commerce/platform-data";
import { getStorefrontPublicOrigin } from "@/lib/storefront-public-url";
import { CmsPageBlocksEditor } from "./CmsPageBlocksEditor";

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
  parent_slug: string | null;
  breadcrumb_label: string | null;
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
  const [showBlocksAdvancedJson, setShowBlocksAdvancedJson] = useState(false);
  const [jsonLdText, setJsonLdText] = useState("");
  const [slugWhenOpened, setSlugWhenOpened] = useState<string | null>(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

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
    setShowBlocksAdvancedJson(false);
    setJsonLdText(
      editing.json_ld != null ? JSON.stringify(editing.json_ld, null, 2) : "",
    );
  }, [editing]);

  const save = async () => {
    if (!editing || !canWrite) return;
    setSaving(true);
    setSaveError(null);
    let blocks: unknown = [];
    if (showBlocksAdvancedJson) {
      try {
        blocks = JSON.parse(blocksJson) as unknown;
      } catch {
        setSaveError("Blocks must be valid JSON array");
        setSaving(false);
        return;
      }
    } else {
      blocks = editing.blocks ?? [];
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
      parent_slug: editing.parent_slug,
      breadcrumb_label: editing.breadcrumb_label,
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
      if (j.data) {
        setEditing(j.data as CmsPageRow);
        setSlugWhenOpened(j.data.slug);
      }
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

  const createSlugRedirect = async () => {
    if (!editing?.id || !slugWhenOpened || slugWhenOpened === editing.slug || !canWrite) return;
    setRedirectMessage(null);
    const from_path = `/p/${slugWhenOpened.replace(/^\/+/, "").replace(/^p\//, "")}`;
    const toSlug = editing.slug.replace(/^\/+/, "").replace(/^p\//, "");
    const to_path = `/p/${toSlug}`;
    const r = await fetch("/api/admin/cms/redirects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_path, to_path, status_code: 301, active: true }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      setRedirectMessage(j.error ?? "Could not create redirect");
      return;
    }
    setRedirectMessage(`Redirect saved: ${from_path} -> ${to_path}`);
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
          onClick={() => {
            setSlugWhenOpened(null);
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
              parent_slug: null,
              breadcrumb_label: null,
            });
          }}
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
                  onClick={() => {
                    setSlugWhenOpened(p.slug);
                    setRedirectMessage(null);
                    setEditing({
                      ...p,
                      parent_slug: p.parent_slug ?? null,
                      breadcrumb_label: p.breadcrumb_label ?? null,
                    });
                  }}
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
              Parent page slug (optional, for breadcrumbs)
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono"
                value={editing.parent_slug ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    parent_slug: e.target.value.trim() || null,
                  })
                }
                placeholder="e.g. about (not /p/about)"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Breadcrumb label override
              <input
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={editing.breadcrumb_label ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    breadcrumb_label: e.target.value.trim() || null,
                  })
                }
                placeholder="Shorter label in the trail; defaults to title"
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
            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-600">
                Page blocks (drag to reorder)
              </span>
              <CmsPageBlocksEditor
                value={editing.blocks ?? []}
                disabled={!canWrite}
                onChange={(next: CmsBlock[]) =>
                  setEditing({ ...editing, blocks: next })
                }
              />
              <button
                type="button"
                className="text-xs font-medium text-slate-500 underline"
                onClick={() => {
                  setShowBlocksAdvancedJson((v) => {
                    const next = !v;
                    if (next && editing) {
                      setBlocksJson(JSON.stringify(editing.blocks ?? [], null, 2));
                    }
                    return next;
                  });
                }}
              >
                {showBlocksAdvancedJson ? "Hide" : "Show"} advanced blocks JSON
              </button>
              {showBlocksAdvancedJson ? (
                <textarea
                  className="mt-1 w-full min-h-[160px] rounded border border-slate-200 px-3 py-2 text-sm font-mono"
                  value={blocksJson}
                  onChange={(e) => setBlocksJson(e.target.value)}
                />
              ) : null}
            </div>
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
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold text-slate-700">SEO checklist</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600">
                <li className={editing.meta_title?.trim() ? "text-green-800" : ""}>
                  Meta title {editing.meta_title?.trim() ? "set" : "missing"}
                </li>
                <li
                  className={
                    (editing.meta_description?.trim().length ?? 0) >= 50 &&
                    (editing.meta_description?.trim().length ?? 0) <= 170
                      ? "text-green-800"
                      : ""
                  }
                >
                  Meta description length (aim 50–170 chars):{" "}
                  {editing.meta_description?.trim().length ?? 0}
                </li>
                <li className={editing.canonical_url?.trim() ? "text-green-800" : ""}>
                  Canonical URL {editing.canonical_url?.trim() ? "set" : "optional but recommended"}
                </li>
                <li className={editing.og_image_url?.trim() ? "text-green-800" : ""}>
                  OG image {editing.og_image_url?.trim() ? "set" : "optional"}
                </li>
              </ul>
            </div>
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={!canWrite}
                onClick={() =>
                  setEditing({
                    ...editing,
                    preview_token:
                      typeof crypto !== "undefined" && crypto.randomUUID
                        ? crypto.randomUUID()
                        : `pv_${Date.now()}`,
                  })
                }
              >
                Generate preview token
              </button>
              <a
                className="inline-flex items-center rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                href={`${getStorefrontPublicOrigin()}/p/${encodeURIComponent(editing.slug)}${
                  editing.preview_token?.trim()
                    ? `?preview=${encodeURIComponent(editing.preview_token.trim())}`
                    : ""
                }`}
                target="_blank"
                rel="noreferrer"
              >
                Open storefront preview
              </a>
            </div>
            {editing.id &&
            slugWhenOpened &&
            editing.slug !== slugWhenOpened &&
            slugWhenOpened.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
                <p className="font-medium">Slug changed from {slugWhenOpened}</p>
                <p className="mt-1 text-amber-900/90">
                  Add a 301 redirect so old links keep working.
                </p>
                <button
                  type="button"
                  disabled={!canWrite}
                  className="mt-2 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                  onClick={() => void createSlugRedirect()}
                >
                  Create redirect /p/{slugWhenOpened} to /p/{editing.slug}
                </button>
                {redirectMessage ? <p className="mt-2 text-slate-700">{redirectMessage}</p> : null}
              </div>
            ) : null}
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
              Public URL when published: <code>/p/{editing.slug || "slug"}</code>. Draft preview uses{" "}
              <code>?preview=</code> with your preview token on that path (see Open storefront preview
              above).
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
