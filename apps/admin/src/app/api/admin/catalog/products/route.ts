import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { createMedusaCatalogOperations } from "@/domain/operations/catalog-operations";
import { upsertEntityWorkflow } from "@/lib/admin-workflow";
import { authOptions } from "@/lib/auth";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { getCorrelationId } from "@/lib/request-correlation";
import { jsonFromAdminOperationResult } from "@/lib/staff-api-operation";
import { insertStaffAuditLog } from "@/lib/staff-audit";
import { parseOptionalStockQuantity } from "@/lib/parse-optional-stock-quantity";
import {
  parseStorefrontMetadataFromBody,
  parseVariantBarcodeFromBody,
} from "@/lib/parse-catalog-product-body";
import { parseCatalogOptionArray } from "@/lib/parse-catalog-option-array";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "catalog:write")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title : "";
  const pricePhp = Number(body.pricePhp);
  const status = body.status === "published" ? "published" : "draft";
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  const sizeLabel =
    typeof body.sizeLabel === "string" ? body.sizeLabel : undefined;
  const colorLabel =
    typeof body.colorLabel === "string" ? body.colorLabel : undefined;
  const sizeLabelsArr = parseCatalogOptionArray(body.sizeLabels);
  const colorLabelsArr = parseCatalogOptionArray(body.colorLabels);

  const stockParsed = parseOptionalStockQuantity(body);
  if (!stockParsed.ok) {
    return correlatedJson(correlationId, { error: stockParsed.error }, { status: 400 });
  }

  const storefrontMetadata = parseStorefrontMetadataFromBody(body);
  const variantBarcode = parseVariantBarcodeFromBody(body);

  const imageUrlsRaw = body.imageUrls;
  const imageUrls = Array.isArray(imageUrlsRaw)
    ? imageUrlsRaw
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim())
    : undefined;

  const ops = createMedusaCatalogOperations();
  const result = await ops.createProduct({
    title,
    handle: typeof body.handle === "string" ? body.handle : undefined,
    description:
      typeof body.description === "string" ? body.description : undefined,
    status,
    pricePhp: Number.isFinite(pricePhp) ? pricePhp : NaN,
    sku: typeof body.sku === "string" ? body.sku : null,
    imageUrls,
    thumbnail:
      typeof body.thumbnail === "string" ? body.thumbnail : null,
    categoryIds,
    sizeLabel,
    colorLabel,
    sizeLabels: sizeLabelsArr,
    colorLabels: colorLabelsArr,
    stockQuantity: stockParsed.value,
    variantBarcode: variantBarcode ?? null,
    storefrontMetadata,
  });

  if (!result.ok) {
    return jsonFromAdminOperationResult(correlationId, result, 201);
  }

  const actorEmail = session.user.email?.trim();
  if (actorEmail) {
    const sup = adminSupabaseOr503(correlationId);
    if ("client" in sup) {
      await insertStaffAuditLog(sup.client, {
        actorEmail,
        action: "catalog.product.create",
        resource: `product:${result.data.productId}`,
        details: { title: title.trim() },
      });
      await upsertEntityWorkflow(sup.client, {
        entityType: "catalog_product",
        entityId: result.data.productId,
        state: status === "published" ? "published" : "draft",
        actorEmail,
      });
    }
  }

  return correlatedJson(
    correlationId,
    { productId: result.data.productId },
    { status: 201 },
  );
}
