"use client";

import {
  DEFAULT_STOREFRONT_HOME_PAYLOAD,
  type StorefrontHomePayload,
  staffHasPermission,
} from "@apparel-commerce/platform-data";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

function labelClass() {
  return "block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5";
}

function inputClass() {
  return "w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary/30";
}

export function StorefrontHomeEditor() {
  const { data: session, status } = useSession();
  const [payload, setPayload] = useState<StorefrontHomePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "settings:write");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/storefront-home")
      .then(async (r) => {
        const j = (await r.json()) as { data?: StorefrontHomePayload; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data;
      })
      .then((data) => {
        if (!cancelled && data) setPayload(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Unable to load content");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateHero = useCallback(
    (patch: Partial<StorefrontHomePayload["hero"]>) => {
      setPayload((p) => (p ? { ...p, hero: { ...p.hero, ...patch } } : p));
    },
    [],
  );

  const updateTile = useCallback(
    (index: 0 | 1 | 2, patch: Partial<StorefrontHomePayload["tiles"][0]>) => {
      setPayload((p) => {
        if (!p) return p;
        const tiles = [...p.tiles] as StorefrontHomePayload["tiles"];
        tiles[index] = { ...tiles[index], ...patch };
        return { ...p, tiles };
      });
    },
    [],
  );

  const updateLatest = useCallback(
    (patch: Partial<StorefrontHomePayload["latestSection"]>) => {
      setPayload((p) => (p ? { ...p, latestSection: { ...p.latestSection, ...patch } } : p));
    },
    [],
  );

  const updateNewsletter = useCallback(
    (patch: Partial<StorefrontHomePayload["newsletter"]>) => {
      setPayload((p) => (p ? { ...p, newsletter: { ...p.newsletter, ...patch } } : p));
    },
    [],
  );

  const save = useCallback(async () => {
    if (!payload || !canWrite) return;
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      const r = await fetch("/api/admin/storefront-home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { data?: StorefrontHomePayload; error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      if (j.data) setPayload(j.data);
      setSavedOk(true);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }, [payload, canWrite]);

  const resetDefaults = useCallback(() => {
    setPayload(JSON.parse(JSON.stringify(DEFAULT_STOREFRONT_HOME_PAYLOAD)) as StorefrontHomePayload);
    setSavedOk(false);
  }, []);

  if (status === "loading" || !payload) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-600">
        {loadError ? (
          <p className="text-red-700">{loadError}</p>
        ) : (
          <p>Loading storefront content…</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canWrite || saving}
          className="rounded bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={resetDefaults}
          disabled={!canWrite}
          className="rounded border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Reset form to defaults
        </button>
        {savedOk && (
          <span className="text-sm text-emerald-700">Saved. The live shop will show updates on next visit.</span>
        )}
        {saveError && <span className="text-sm text-red-700">{saveError}</span>}
        {!canWrite && (
          <span className="text-sm text-slate-500">You can view this page. Ask an admin for settings write access to publish changes.</span>
        )}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-primary mb-4">Hero</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass()}>Headline line 1</label>
            <input
              className={inputClass()}
              value={payload.hero.line1}
              onChange={(e) => updateHero({ line1: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass()}>Headline line 2</label>
            <input
              className={inputClass()}
              value={payload.hero.line2}
              onChange={(e) => updateHero({ line2: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass()}>Intro text</label>
          <textarea
            className={`${inputClass()} min-h-[5rem]`}
            value={payload.hero.lead}
            onChange={(e) => updateHero({ lead: e.target.value })}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            id="privacy"
            type="checkbox"
            checked={payload.hero.showPrivacyLink}
            onChange={(e) => updateHero({ showPrivacyLink: e.target.checked })}
          />
          <label htmlFor="privacy" className="text-sm text-slate-700">
            Show Privacy policy link after intro
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass()}>Primary button label</label>
            <input
              className={inputClass()}
              value={payload.hero.ctaLabel}
              onChange={(e) => updateHero({ ctaLabel: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass()}>Primary button link</label>
            <input
              className={inputClass()}
              value={payload.hero.ctaHref}
              onChange={(e) => updateHero({ ctaHref: e.target.value })}
              placeholder="/shop"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass()}>Hero image URL (optional)</label>
          <input
            className={inputClass()}
            value={payload.hero.imageUrl}
            onChange={(e) => updateHero({ imageUrl: e.target.value })}
            placeholder="https://…"
          />
          <p className="mt-1 text-xs text-slate-500">
            Paste a public https image (for example from your commerce media). Leave empty for a solid color panel.
          </p>
        </div>
      </section>

      {[0, 1, 2].map((i) => {
        const tile = payload.tiles[i];
        const titles = ["Category tile 1 (large)", "Category tile 2 (narrow)", "Category tile 3 (wide)"];
        return (
          <section
            key={i}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-primary mb-4">{titles[i]}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass()}>Title</label>
                <input
                  className={inputClass()}
                  value={tile.title}
                  onChange={(e) => updateTile(i as 0 | 1 | 2, { title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass()}>Link (path or URL)</label>
                <input
                  className={inputClass()}
                  value={tile.href}
                  onChange={(e) => updateTile(i as 0 | 1 | 2, { href: e.target.value })}
                  placeholder="/shop?category=Shorts"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass()}>Link label</label>
                <input
                  className={inputClass()}
                  value={tile.linkLabel}
                  onChange={(e) => updateTile(i as 0 | 1 | 2, { linkLabel: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass()}>Layout</label>
                <select
                  className={inputClass()}
                  value={tile.variant}
                  onChange={(e) =>
                    updateTile(i as 0 | 1 | 2, {
                      variant: e.target.value as StorefrontHomePayload["tiles"][0]["variant"],
                    })
                  }
                >
                  <option value="large">Large (left)</option>
                  <option value="small">Small (right)</option>
                  <option value="wide">Wide (full row)</option>
                </select>
              </div>
            </div>
            {tile.variant === "wide" && (
              <div className="mt-4">
                <label className={labelClass()}>Subtitle (wide tile)</label>
                <input
                  className={inputClass()}
                  value={tile.subtitle ?? ""}
                  onChange={(e) => updateTile(i as 0 | 1 | 2, { subtitle: e.target.value })}
                />
              </div>
            )}
            <div className="mt-4">
              <label className={labelClass()}>Background image URL (optional)</label>
              <input
                className={inputClass()}
                value={tile.imageUrl}
                onChange={(e) => updateTile(i as 0 | 1 | 2, { imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </section>
        );
      })}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-primary mb-4">Latest products section</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass()}>Section title</label>
            <input
              className={inputClass()}
              value={payload.latestSection.title}
              onChange={(e) => updateLatest({ title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass()}>View all link label</label>
            <input
              className={inputClass()}
              value={payload.latestSection.viewAllLabel}
              onChange={(e) => updateLatest({ viewAllLabel: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass()}>View all link path</label>
          <input
            className={inputClass()}
            value={payload.latestSection.viewAllHref}
            onChange={(e) => updateLatest({ viewAllHref: e.target.value })}
            placeholder="/shop"
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-primary mb-4">Newsletter block</h3>
        <div className="grid gap-4">
          <div>
            <label className={labelClass()}>Title</label>
            <input
              className={inputClass()}
              value={payload.newsletter.title}
              onChange={(e) => updateNewsletter({ title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass()}>Body</label>
            <textarea
              className={`${inputClass()} min-h-[4rem]`}
              value={payload.newsletter.body}
              onChange={(e) => updateNewsletter({ body: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass()}>Email placeholder</label>
              <input
                className={inputClass()}
                value={payload.newsletter.placeholder}
                onChange={(e) => updateNewsletter({ placeholder: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass()}>Button label</label>
              <input
                className={inputClass()}
                value={payload.newsletter.buttonLabel}
                onChange={(e) => updateNewsletter({ buttonLabel: e.target.value })}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
