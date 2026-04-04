"use client";

import type { CmsAbExperimentRow } from "@apparel-commerce/platform-data";
import { pickCmsAbVariantId } from "@apparel-commerce/sdk/cms-experiment-pick";
import { useEffect } from "react";

export function CmsExperimentAssigner({ experiments }: { experiments: CmsAbExperimentRow[] }) {
  useEffect(() => {
    if (!experiments.length || typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24 * 30;
    for (const e of experiments) {
      const cookieName = `cms_ab_${e.experiment_key}`;
      if (document.cookie.split("; ").some((c) => c.startsWith(`${cookieName}=`))) continue;
      const variant = pickCmsAbVariantId(e.variants);
      document.cookie = `${cookieName}=${encodeURIComponent(variant)}; path=/; max-age=${maxAge}; samesite=lax`;
      void fetch("/api/cms/experiments/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment_key: e.experiment_key,
          variant_id: variant,
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [experiments]);
  return null;
}
