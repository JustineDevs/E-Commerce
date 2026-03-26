"use client";

import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  experiment_key: string;
  name: string;
  active: boolean;
};

export function CmsExperimentsManager() {
  const { data: session, status } = useSession();
  const canWrite = staffHasPermission(session?.user?.permissions ?? [], "content:write");
  const [rows, setRows] = useState<Row[]>([]);
  const [key, setKey] = useState("hero_copy");
  const [name, setName] = useState("Hero copy test");
  const [variantsJson, setVariantsJson] = useState(
    '[{"id":"a","weight":0.5},{"id":"b","weight":0.5}]',
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/cms/experiments")
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
    let variants: unknown;
    try {
      variants = JSON.parse(variantsJson) as unknown;
    } catch {
      setError("Variants must be JSON array");
      return;
    }
    setError(null);
    const r = await fetch("/api/admin/cms/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experiment_key: key,
        name,
        variants,
        active: true,
      }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      setError(j.error ?? "Failed");
      return;
    }
    load();
  };

  if (status === "loading") return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <p className="text-sm text-slate-600">
        Active experiments are readable by the storefront anon key. The assigner sets cookies{" "}
        <code className="text-xs">cms_ab_[key]</code>.
      </p>
      <div className="space-y-2">
        <input
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="experiment_key"
        />
        <input
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
        <textarea
          className="w-full min-h-[100px] rounded border border-slate-200 px-3 py-2 font-mono text-sm"
          value={variantsJson}
          onChange={(e) => setVariantsJson(e.target.value)}
        />
        <button
          type="button"
          disabled={!canWrite}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => void add()}
        >
          Create / upsert
        </button>
      </div>
      <ul className="text-sm space-y-1">
        {rows.map((r) => (
          <li key={r.id}>
            <strong>{r.experiment_key}</strong> — {r.name} {r.active ? "(active)" : "(inactive)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
