import Medusa from "@medusajs/js-sdk";
import {
  getMedusaPublishableKey,
  getMedusaRegionId,
  getMedusaSalesChannelId,
  getMedusaSecretApiKey,
  getMedusaStoreBaseUrl,
} from "@apparel-commerce/sdk";

export function getMedusaSecretKey(): string | undefined {
  return getMedusaSecretApiKey();
}

export function getMedusaStoreSdk(): Medusa | null {
  const pk = getMedusaPublishableKey();
  if (!pk) return null;
  return new Medusa({
    baseUrl: getMedusaStoreBaseUrl(),
    publishableKey: pk,
  });
}

export function getMedusaAdminSdk(): Medusa | null {
  const secret = getMedusaSecretKey();
  if (!secret) return null;
  return new Medusa({
    baseUrl: getMedusaStoreBaseUrl(),
    apiKey: secret,
  });
}

export { getMedusaRegionId, getMedusaSalesChannelId };

type OptionRow = {
  option?: { title?: string | null } | null;
  value?: string | null;
};

export function optionRowsToSizeColor(
  rows: OptionRow[] | null | undefined,
): { size: string; color: string } {
  let size = "";
  let color = "";
  for (const row of rows ?? []) {
    const title = (row.option?.title ?? "").toLowerCase();
    const val = String(row.value ?? "").trim();
    if (!val) continue;
    if (title.includes("size") || title === "sizes") {
      size = val;
    } else if (title.includes("color") || title.includes("colour")) {
      color = val;
    }
  }
  if (!size && !color && rows?.length === 1) {
    size = String(rows[0]?.value ?? "").trim();
  }
  return { size, color };
}

export function variantPricePhpFromCalculated(
  calculated_price?: { calculated_amount?: number | null } | null,
): number {
  const amt = calculated_price?.calculated_amount;
  if (typeof amt !== "number" || !Number.isFinite(amt)) {
    return 0;
  }
  return Math.round((amt / 100) * 100) / 100;
}
