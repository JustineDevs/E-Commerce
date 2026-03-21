import { NextResponse } from "next/server";
import {
  getMedusaAdminSdk,
  getMedusaRegionId,
  getMedusaStoreSdk,
  optionRowsToSizeColor,
  variantPricePhpFromCalculated,
} from "@/lib/medusa-pos";
import { requireStaffSession } from "@/lib/requireStaffSession";

export async function POST(req: Request) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return staff.response;
  }

  const body = (await req.json().catch(() => ({}))) as {
    barcode?: string;
    sku?: string;
  };
  const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const trimmed = barcode || sku;
  if (!trimmed) {
    return NextResponse.json({ error: "Missing barcode or sku" }, { status: 400 });
  }

  const regionId = getMedusaRegionId();
  const storeSdk = getMedusaStoreSdk();
  const adminSdk = getMedusaAdminSdk();
  if (!regionId || !storeSdk || !adminSdk) {
    return NextResponse.json(
      {
        error:
          "Medusa POS env incomplete (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, MEDUSA_REGION_ID, MEDUSA_SECRET_API_KEY)",
      },
      { status: 503 },
    );
  }

  type VariantLike = {
    id?: string;
    sku?: string | null;
    calculated_price?: { calculated_amount?: number | null } | null;
    options?: Array<{ option?: { title?: string | null } | null; value?: string | null }>;
    product?: { title?: string | null; id?: string | null };
    product_id?: string | null;
  };

  let variant: VariantLike | null = null;
  let productTitle = "";

  try {
    const storeList = await storeSdk.store.product.list({
      region_id: regionId,
      q: trimmed,
      limit: 50,
      fields:
        "*variants,*variants.calculated_price,*variants.options,*variants.sku,+title",
    });
    outerStore: for (const p of storeList.products ?? []) {
      for (const v of p.variants ?? []) {
        const vSku = String(v.sku ?? "").trim();
        const ext = v as VariantLike & { ean?: string; barcode?: string };
        const barcodeMatch =
          String(ext.ean ?? "").trim() === trimmed ||
          String(ext.barcode ?? "").trim() === trimmed;
        if (vSku === trimmed || barcodeMatch) {
          variant = v as VariantLike;
          productTitle = p.title ?? "";
          break outerStore;
        }
      }
    }
  } catch {
    /* try admin */
  }

  if (!variant) {
    try {
      const adminProducts = await adminSdk.admin.product.list({
        q: trimmed,
        limit: 25,
        fields: "+variants.id,+variants.sku,+variants.options.*,+title",
      });
      outerAdmin: for (const p of adminProducts.products ?? []) {
        const variants = p.variants ?? [];
        const exact = variants.find(
          (x) => String(x.sku ?? "").trim() === trimmed,
        );
        const pick = exact ?? variants[0];
        const pid = p.id;
        if (pick?.id && pid) {
          const prod = await storeSdk.store.product.retrieve(pid, {
            region_id: regionId,
            fields:
              "*variants,*variants.calculated_price,*variants.options,*variants.sku,+title",
          });
          const vmatch = prod.product?.variants?.find((x) => x.id === pick.id);
          variant = (vmatch ?? pick) as VariantLike;
          productTitle = prod.product?.title ?? p.title ?? "";
          break outerAdmin;
        }
      }
    } catch {
      /* not found */
    }
  }

  if (!variant?.id) {
    return new NextResponse(null, { status: 404 });
  }

  const { size, color } = optionRowsToSizeColor(variant.options);
  const price = variantPricePhpFromCalculated(variant.calculated_price);

  return NextResponse.json({
    id: variant.id,
    sku: String(variant.sku ?? ""),
    size,
    color,
    price,
    products: { name: productTitle },
  });
}
