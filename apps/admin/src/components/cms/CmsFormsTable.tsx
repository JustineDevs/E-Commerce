"use client";

import { useCallback, useEffect, useState } from "react";

type Sub = {
  id: string;
  form_key: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export function CmsFormsTable() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/cms/forms/submissions")
      .then(async (r) => {
        const j = (await r.json()) as { data?: Sub[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        return j.data ?? [];
      })
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load content"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-2 pr-4">When</th>
            <th className="py-2 pr-4">Form</th>
            <th className="py-2">Payload</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="py-2 pr-4">{r.form_key}</td>
              <td className="py-2 font-mono text-xs break-all">{JSON.stringify(r.payload)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
