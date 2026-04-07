import Medusa from "@medusajs/js-sdk";
import { evaluateWebCheckoutPolicy } from "@apparel-commerce/omnichannel-policy";
import {
  getMedusaPublishableKey,
  getMedusaRegionId,
  getMedusaStoreBaseUrl,
  withSalesChannelId,
} from "./storefront-medusa-env";
import { createStorefrontMedusaSdk } from "./medusa-sdk";
import { medusaMinorToMajor } from "./medusa-money";
import { tryDeleteStoreCart } from "./medusa-checkout-errors";
import { assertStorefrontLinesStock } from "./storefront-inventory-guard";
import { buildCheckoutQuoteFingerprint } from "./checkout-quote-fingerprint";
import type { MedusaCartAddressPayload } from "@/lib/medusa-profile-address";

export type MedusaCheckoutLine = { variantId: string; quantity: number };

export type CodCartPayload = {
  email: string;
  shipping_address: MedusaCartAddressPayload;
  billing_address: MedusaCartAddressPayload;
};

export type MedusaCheckoutTotalsPreview = {
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  currencyCode: string;
  lineSubtotalsByVariantId: Record<string, number>;
  quoteFingerprint: string;
  variantIds: string[];
  productIds: string[];
  shippingMethodIds: string[];
  regionId: string | null;
};

type PrepareMedusaCartInput = {
  lines: MedusaCheckoutLine[];
  email?: string;
  loyaltyPointsToRedeem?: number;
  codCartPayload?: CodCartPayload;
};

export type PrepareMedusaCartContext = {
  sdk: Medusa;
  cartId: string;
  baseUrl: string;
  publishableKey: string;
};

/**
 * Builds a store cart with lines, optional COD addresses, default shipping, and optional loyalty.
 * Does not start payment. Caller owns the cart until delete or completion.
 */
export async function prepareMedusaStoreCart(
  input: PrepareMedusaCartInput,
  codFlow: boolean,
): Promise<PrepareMedusaCartContext> {
  const stock = await assertStorefrontLinesStock(input.lines);
  if (!stock.ok) {
    throw new Error(stock.message);
  }
  const webPolicy = evaluateWebCheckoutPolicy({ stockVerified: true });
  if (!webPolicy.allowed) {
    throw new Error(webPolicy.violations.join("; ") || "Checkout policy denied");
  }

  const baseUrl = getMedusaStoreBaseUrl();
  const publishableKey = getMedusaPublishableKey();
  const regionId = getMedusaRegionId();
  if (!publishableKey || !regionId) {
    throw new Error(
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY and NEXT_PUBLIC_MEDUSA_REGION_ID are required.",
    );
  }

  if (codFlow) {
    if (!input.codCartPayload?.email?.trim()) {
      throw new Error(
        "Cash on delivery requires a verified delivery profile. Open your account and complete your address, then try again.",
      );
    }
  }

  const sdk = new Medusa({ baseUrl, publishableKey });

  const { cart: created } = await sdk.store.cart.create(
    withSalesChannelId({ region_id: regionId }) as Parameters<
      typeof sdk.store.cart.create
    >[0],
  );
  const cartId = created?.id;
  if (!cartId) {
    throw new Error("The store did not return a cart id.");
  }

  for (const line of input.lines) {
    await sdk.store.cart.createLineItem(cartId, {
      variant_id: line.variantId,
      quantity: line.quantity,
    });
  }

  const cartEmail = codFlow
    ? input.codCartPayload!.email.trim()
    : input.email?.trim();
  if (cartEmail) {
    await sdk.store.cart.update(cartId, { email: cartEmail });
  }

  if (codFlow && input.codCartPayload) {
    await sdk.store.cart.update(cartId, {
      shipping_address: input.codCartPayload.shipping_address,
      billing_address: input.codCartPayload.billing_address,
    });
  }

  const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
    cart_id: cartId,
  });
  const firstOption = shipping_options?.[0];
  if (!firstOption?.id) {
    throw new Error(
      "No shipping options available for this cart. Check your region and shipping setup.",
    );
  }

  await sdk.store.cart.addShippingMethod(cartId, { option_id: firstOption.id });

  const loyaltyPts = Math.floor(Number(input.loyaltyPointsToRedeem ?? 0));
  if (loyaltyPts > 0) {
    if (!cartEmail) {
      throw new Error("Email is required on the cart before redeeming loyalty points.");
    }
    const loyaltyRes = await fetch(
      `${baseUrl.replace(/\/$/, "")}/store/carts/${encodeURIComponent(cartId)}/loyalty`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": publishableKey,
        },
        body: JSON.stringify({ points: loyaltyPts }),
      },
    );
    if (!loyaltyRes.ok) {
      const errText = await loyaltyRes.text().catch(() => "");
      throw new Error(
        errText || `Loyalty redemption failed (${loyaltyRes.status}).`,
      );
    }
  }

  return { sdk, cartId, baseUrl, publishableKey };
}

function readMinorField(record: Record<string, unknown>, key: string): number {
  const v = record[key];
  if (typeof v === "bigint") return Number(v);
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Medusa cart monetary fields are integers in the smallest currency unit. */
export function readMedusaCartMinorField(
  cart: Record<string, unknown>,
  key: string,
): number {
  return readMinorField(cart, key);
}

const TOTAL_RECONCILE_TOLERANCE_MAJOR = 0.02;

/**
 * When GET /store/carts/:id returns a `total` that is below subtotal + shipping + tax − discount
 * (seen after shipping methods apply), use the component sum so UI and confirmed amount match Medusa payment math.
 */
export function reconcileMedusaCartGrandTotalMajor(
  cart: Record<string, unknown>,
  currencyCode: string,
): { totalMajor: number; reconciled: boolean } {
  const cur = currencyCode.trim().toUpperCase();
  const sub = medusaMinorToMajor(readMinorField(cart, "subtotal"), cur);
  const ship = medusaMinorToMajor(readMinorField(cart, "shipping_total"), cur);
  const tax = medusaMinorToMajor(readMinorField(cart, "tax_total"), cur);
  const disc = medusaMinorToMajor(readMinorField(cart, "discount_total"), cur);
  const api = medusaMinorToMajor(readMinorField(cart, "total"), cur);
  const componentsSum = sub + ship + tax - disc;
  const roundedSum = Math.round(componentsSum * 1e6) / 1e6;
  const roundedApi = Math.round(api * 1e6) / 1e6;
  if (
    roundedSum > TOTAL_RECONCILE_TOLERANCE_MAJOR &&
    roundedApi + TOTAL_RECONCILE_TOLERANCE_MAJOR < roundedSum - TOTAL_RECONCILE_TOLERANCE_MAJOR
  ) {
    return { totalMajor: roundedSum, reconciled: true };
  }
  return { totalMajor: roundedApi, reconciled: false };
}

export function cartToTotalsPreview(cart: unknown): MedusaCheckoutTotalsPreview {
  if (!cart || typeof cart !== "object") {
    throw new Error("Invalid cart response from store.");
  }
  const c = cart as Record<string, unknown>;
  const currencyRaw = String(c.currency_code ?? "PHP");
  const subtotal = medusaMinorToMajor(readMinorField(c, "subtotal"), currencyRaw);
  const taxTotal = medusaMinorToMajor(readMinorField(c, "tax_total"), currencyRaw);
  const shippingTotal = medusaMinorToMajor(
    readMinorField(c, "shipping_total"),
    currencyRaw,
  );
  const discountTotal = medusaMinorToMajor(
    readMinorField(c, "discount_total"),
    currencyRaw,
  );
  const { totalMajor: total } = reconcileMedusaCartGrandTotalMajor(c, currencyRaw);

  const lineSubtotalsByVariantId: Record<string, number> = {};
  const items = Array.isArray(c.items) ? c.items : [];
  const variantIds = new Set<string>();
  const productIds = new Set<string>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const variant = it.variant as Record<string, unknown> | undefined;
    const variantId =
      typeof it.variant_id === "string"
        ? it.variant_id
        : typeof variant?.id === "string"
          ? variant.id
          : "";
    if (!variantId) continue;
    variantIds.add(variantId.trim());
    const productId =
      typeof it.product_id === "string"
        ? it.product_id
        : typeof variant?.product_id === "string"
          ? variant.product_id
          : "";
    if (productId.trim()) {
      productIds.add(productId.trim());
    }
    let subMinor = readMinorField(it, "subtotal");
    if (subMinor <= 0) {
      const unit = readMinorField(it, "unit_price");
      const qty =
        typeof it.quantity === "number" && Number.isFinite(it.quantity)
          ? Math.max(1, Math.floor(it.quantity))
          : 1;
      if (unit > 0) subMinor = unit * qty;
    }
    const lineMajor = medusaMinorToMajor(subMinor, currencyRaw);
    lineSubtotalsByVariantId[variantId] =
      (lineSubtotalsByVariantId[variantId] ?? 0) + lineMajor;
  }

  const shippingMethodIds = new Set<string>();
  const shippingMethods = Array.isArray(c.shipping_methods)
    ? c.shipping_methods
    : [];
  for (const raw of shippingMethods) {
    if (!raw || typeof raw !== "object") continue;
    const shippingMethod = raw as Record<string, unknown>;
    const methodId =
      typeof shippingMethod.shipping_option_id === "string"
        ? shippingMethod.shipping_option_id
        : typeof shippingMethod.id === "string"
          ? shippingMethod.id
          : "";
    if (methodId.trim()) {
      shippingMethodIds.add(methodId.trim());
    }
  }

  const regionId =
    typeof c.region_id === "string" && c.region_id.trim()
      ? c.region_id.trim()
      : null;
  const quoteFingerprint = buildCheckoutQuoteFingerprint({
    currencyCode: currencyRaw,
    subtotal,
    taxTotal,
    shippingTotal,
    discountTotal,
    total,
    lineSubtotalsByVariantId,
    variantIds: [...variantIds],
    productIds: [...productIds],
    shippingMethodIds: [...shippingMethodIds],
    regionId,
  });

  return {
    subtotal,
    taxTotal,
    shippingTotal,
    discountTotal,
    total,
    currencyCode: currencyRaw.toUpperCase(),
    lineSubtotalsByVariantId,
    quoteFingerprint,
    variantIds: [...variantIds].sort(),
    productIds: [...productIds].sort(),
    shippingMethodIds: [...shippingMethodIds].sort(),
    regionId,
  };
}

/** Same totals as checkout: ephemeral cart is always deleted. */
export async function executeMedusaCheckoutTotalsPreview(input: {
  lines: MedusaCheckoutLine[];
  email?: string;
  loyaltyPointsToRedeem?: number;
  codCartPayload?: CodCartPayload;
}): Promise<MedusaCheckoutTotalsPreview> {
  const codFlow = Boolean(input.codCartPayload?.email?.trim());
  const ctx = await prepareMedusaStoreCart(
    {
      lines: input.lines,
      email: codFlow ? undefined : input.email,
      codCartPayload: input.codCartPayload,
      loyaltyPointsToRedeem: input.loyaltyPointsToRedeem,
    },
    codFlow,
  );

  try {
    const { cart } = await ctx.sdk.store.cart.retrieve(ctx.cartId, {
      fields:
        "id,region_id,total,currency_code,subtotal,tax_total,shipping_total,discount_total,*items,*shipping_methods",
    } as never);
    return cartToTotalsPreview(cart);
  } finally {
    await tryDeleteStoreCart(ctx.cartId, ctx.baseUrl, ctx.publishableKey);
  }
}

export async function readMedusaCartTotalsPreview(
  cartId: string,
): Promise<MedusaCheckoutTotalsPreview> {
  const sdk = createStorefrontMedusaSdk();
  const { cart } = await sdk.store.cart.retrieve(cartId, {
    fields:
      "id,region_id,total,currency_code,subtotal,tax_total,shipping_total,discount_total,*items,*shipping_methods",
  } as never);
  return cartToTotalsPreview(cart);
}
