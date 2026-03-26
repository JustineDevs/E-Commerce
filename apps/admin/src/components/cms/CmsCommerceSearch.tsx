"use client";

import { AdminTechnicalDetails } from "@/components/AdminTechnicalDetails";
import { useSession } from "next-auth/react";
import { staffHasPermission } from "@apparel-commerce/platform-data";
import { useState } from "react";

export function CmsCommerceSearch() {
  const { data: session, status } = useSession();
  const canRead = staffHasPermission(session?.user?.permissions ?? [], "content:read");
  const [q, setQ] = useState("");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setError(null);
    setResult("");
    const r = await fetch(`/api/admin/commerce/products/search?q=${encodeURIComponent(q)}`);
    const text = await r.text();
    if (!r.ok) {
      setError(text);
      return;
    }
    setResult(text);
  };

  if (status === "loading") return <p className="text-sm text-slate-600">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-600">
        Type part of a product name or SKU. Raw results appear below for copying into your content or
        for your developer to wire up.
      </p>
      <AdminTechnicalDetails className="text-slate-600">
        <p>
          Search uses the same secure server link as your catalog. Response shape matches your store
          admin product list for staff who need raw data.
        </p>
      </AdminTechnicalDetails>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product name, SKU, or keyword"
        />
        <button
          type="button"
          disabled={!canRead}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => void search()}
        >
          Search
        </button>
      </div>
      {error ? <pre className="text-xs text-red-700 whitespace-pre-wrap">{error}</pre> : null}
      {result ? <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-[480px]">{result}</pre> : null}
    </div>
  );
}
