"use client";

import type { CmsAbExperimentRow } from "@apparel-commerce/platform-data";
import { useEffect } from "react";

function pickVariant(variants: unknown): string {
  if (!Array.isArray(variants) || variants.length === 0) return "a";
  const weights = variants.map((v) => {
    if (v && typeof v === "object" && "weight" in v) {
      const w = Number((v as { weight: unknown }).weight);
      return Number.isFinite(w) && w > 0 ? w : 1;
    }
    return 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < variants.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) {
      const id = (variants[i] as { id?: string })?.id;
      return typeof id === "string" && id ? id : String(i);
    }
  }
  const last = variants[variants.length - 1] as { id?: string };
  return typeof last?.id === "string" ? last.id : "a";
}

export function CmsExperimentAssigner({ experiments }: { experiments: CmsAbExperimentRow[] }) {
  useEffect(() => {
    if (!experiments.length || typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24 * 30;
    for (const e of experiments) {
      const cookieName = `cms_ab_${e.experiment_key}`;
      if (document.cookie.split("; ").some((c) => c.startsWith(`${cookieName}=`))) continue;
      const variant = pickVariant(e.variants);
      document.cookie = `${cookieName}=${encodeURIComponent(variant)}; path=/; max-age=${maxAge}; samesite=lax`;
    }
  }, [experiments]);
  return null;
}
