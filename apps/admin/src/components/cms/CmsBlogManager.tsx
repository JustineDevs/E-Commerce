"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

export function CmsBlogManager() {
  const { status } = useSession();
  const [rows, setRows] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/cms/blog")
      .then(async (r) => {
        const j = (await r.json()) as { data?: Post[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data ?? [];
      })
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load content"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <p className="text-sm text-slate-600">
        Draft and publish posts that appear on your public blog. Open a post to edit content. This list
        shows what is live or in draft.
      </p>
      <details className="text-xs text-slate-500 mt-2">
        <summary className="cursor-pointer font-medium text-slate-700 select-none">
          Details for IT or your developer
        </summary>
        <p className="mt-2 border-l-2 border-slate-200 pl-3 leading-relaxed">
          Full create/update flows can also use the admin JSON APIs if you automate publishing from
          another tool.
        </p>
      </details>
      <ul className="space-y-2">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border border-slate-200 px-4 py-2">
            <span className="text-sm">
              {p.title} <span className="text-slate-500">({p.status})</span>
            </span>
            <Link href={`/blog/${p.slug}`} className="text-xs text-primary underline" target="_blank">
              View storefront
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
