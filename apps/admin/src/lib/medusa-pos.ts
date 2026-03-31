import Medusa from "@medusajs/js-sdk";
import {
  getMedusaPublishableKey,
  getMedusaRegionId,
  getMedusaSalesChannelId,
  getMedusaSecretApiKey,
  getMedusaStoreBaseUrl,
  withSalesChannelId,
} from "@apparel-commerce/sdk";

export function getMedusaSecretKey(): string | undefined {
  return getMedusaSecretApiKey();
}

let _storeSdk: Medusa | null | undefined;
let _adminSdk: Medusa | null | undefined;

export function getMedusaStoreSdk(): Medusa | null {
  if (_storeSdk !== undefined) return _storeSdk;
  const pk = getMedusaPublishableKey();
  if (!pk) { _storeSdk = null; return null; }
  _storeSdk = new Medusa({
    baseUrl: getMedusaStoreBaseUrl(),
    publishableKey: pk,
  });
  return _storeSdk;
}

export function getMedusaAdminSdk(): Medusa | null {
  if (_adminSdk !== undefined) return _adminSdk;
  const secret = getMedusaSecretKey();
  if (!secret) { _adminSdk = null; return null; }
  _adminSdk = new Medusa({
    baseUrl: getMedusaStoreBaseUrl(),
    apiKey: secret,
  });
  return _adminSdk;
}

export { getMedusaRegionId, getMedusaSalesChannelId, withSalesChannelId };

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
