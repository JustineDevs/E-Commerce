import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { createMedusaCatalogOperations } from "@/domain/operations/catalog-operations";
import { upsertEntityWorkflow } from "@/lib/admin-workflow";
import { authOptions } from "@/lib/auth";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { getCorrelationId } from "@/lib/request-correlation";
import { jsonFromAdminOperationResult } from "@/lib/staff-api-operation";
import { insertStaffAuditLog } from "@/lib/staff-audit";
import { fetchCatalogProductDetail } from "@/lib/medusa-catalog-service";
import {
  parseOptionalMatrixCellStocks,
  parseOptionalStockQuantity,
  parseOptionalVariantStocks,
} from "@/lib/parse-optional-stock-quantity";
import {
  parseStorefrontMetadataFromBody,
  parseVariantBarcodeFromBody,
} from "@/lib/parse-catalog-product-body";
import { parseCatalogOptionArray } from "@/lib/parse-catalog-option-array";
import { collectCatalogMediaUrlsFromBody } from "@/lib/catalog-product-media-db";
import { correlatedJson } from "@/lib/staff-api-response";
import { ensureExternalCatalogProductMediaRows } from "@apparel-commerce/platform-data";
import {
  buildStorefrontCommerceInvalidationPayload,
  classifyCatalogMutation,
  notifyStorefrontCommerceInvalidation,
} from "@/lib/storefront-commerce-invalidation";
import { logAdminCatalogMutationClassified } from "@/lib/commerce-observability-log";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteParams) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "catalog:write")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }
  const { id: productId } = await ctx.params;
  if (!productId) {
    return correlatedJson(correlationId, { error: "Missing id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const beforeDetail = await fetchCatalogProductDetail(productId).catch(() => null);
  const title = typeof body.title === "string" ? body.title : "";
  const handle = typeof body.handle === "string" ? body.handle : "";
  const pricePhp = Number(body.pricePhp);
  const status = body.status === "published" ? "published" : "draft";
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  const sizeLabelsArr = parseCatalogOptionArray(body.sizeLabels);
  const colorLabelsArr = parseCatalogOptionArray(body.colorLabels);
  if (
    !sizeLabelsArr ||
    !colorLabelsArr ||
    sizeLabelsArr.length < 1 ||
    colorLabelsArr.length < 1
  ) {
    return correlatedJson(
      correlationId,
      { error: "Select at least one size and one color." },
      { status: 400 },
    );
  }

  const stockParsed = parseOptionalStockQuantity(body);
  if (!stockParsed.ok) {
    return correlatedJson(correlationId, { error: stockParsed.error }, { status: 400 });
  }
  const variantStocksParsed = parseOptionalVariantStocks(body);
  if (!variantStocksParsed.ok) {
    return correlatedJson(
      correlationId,
      { error: variantStocksParsed.error },
      { status: 400 },
    );
  }
  const matrixCellStocksParsed = parseOptionalMatrixCellStocks(body);
  if (!matrixCellStocksParsed.ok) {
    return correlatedJson(
      correlationId,
      { error: matrixCellStocksParsed.error },
      { status: 400 },
    );
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
  const result = await ops.updateProduct(productId, {
    title,
    handle,
    description:
      typeof body.description === "string" ? body.description : null,
    status,
    pricePhp: Number.isFinite(pricePhp) ? pricePhp : NaN,
    sku: typeof body.sku === "string" ? body.sku : null,
    imageUrls,
    thumbnail:
      typeof body.thumbnail === "string" ? body.thumbnail : null,
    categoryIds,
    sizeLabels: sizeLabelsArr,
    colorLabels: colorLabelsArr,
    stockQuantity: stockParsed.value,
    variantStocks: variantStocksParsed.value,
    matrixCellStocks: matrixCellStocksParsed.value,
    variantBarcode,
    storefrontMetadata,
  });

  if (!result.ok) {
    return jsonFromAdminOperationResult(correlationId, result, 200);
  }

  const actorEmail = session.user.email?.trim();
  const sup = adminSupabaseOr503(correlationId);
  if ("client" in sup) {
    await ensureExternalCatalogProductMediaRows(
      sup.client,
      collectCatalogMediaUrlsFromBody(body),
    );
    if (actorEmail) {
      await insertStaffAuditLog(sup.client, {
        actorEmail,
        action: "catalog.product.update",
        resource: `product:${productId}`,
        details: { title: title.trim() },
      });
      await upsertEntityWorkflow(sup.client, {
        entityType: "catalog_product",
        entityId: productId,
        state: status === "published" ? "published" : "draft",
        actorEmail,
      });
    }
  }
  const afterDetail = await fetchCatalogProductDetail(result.data.productId).catch(() => null);
  const classification = classifyCatalogMutation(beforeDetail, afterDetail);
  logAdminCatalogMutationClassified({
    classification,
    productId: result.data.productId,
    correlationId,
    actorEmail,
  });
  const invalidation = await notifyStorefrontCommerceInvalidation(
    buildStorefrontCommerceInvalidationPayload({
      classification,
      before: beforeDetail,
      after: afterDetail,
      actorEmail,
      reason:
        classification === "checkout_affecting"
          ? "A catalog change affected your order. Review the updated price, availability, and total before continuing."
          : classification === "sellability_affecting"
            ? "Availability, publish state, or variant options changed for an item in your order. Review before continuing."
            : undefined,
    }),
  );
  if (!invalidation.ok) {
    console.warn("[admin catalog update] storefront invalidation:", invalidation.error);
  }

  return correlatedJson(correlationId, {
    productId: result.data.productId,
    storefrontInvalidation: invalidation.ok ? "ok" : invalidation.error,
    mutationClassification: classification,
  });
}

export async function DELETE(req: Request, ctx: RouteParams) {
  const correlationId = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(correlationId, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "catalog:write")) {
    return correlatedJson(correlationId, { error: "Forbidden" }, { status: 403 });
  }
  const { id: productId } = await ctx.params;
  if (!productId) {
    return correlatedJson(correlationId, { error: "Missing id" }, { status: 400 });
  }
  const beforeDetail = await fetchCatalogProductDetail(productId).catch(() => null);

  const ops = createMedusaCatalogOperations();
  const result = await ops.deleteProduct(productId);
  if (!result.ok) {
    return jsonFromAdminOperationResult(correlationId, result, 200);
  }

  const actorEmail = session.user.email?.trim();
  if (actorEmail) {
    const sup = adminSupabaseOr503(correlationId);
    if ("client" in sup) {
      await insertStaffAuditLog(sup.client, {
        actorEmail,
        action: "catalog.product.delete",
        resource: `product:${productId}`,
        details: {},
      });
      await sup.client
        .from("admin_entity_workflow")
        .delete()
        .eq("entity_type", "catalog_product")
        .eq("entity_id", productId);
    }
  }
  const invalidation = await notifyStorefrontCommerceInvalidation(
    buildStorefrontCommerceInvalidationPayload({
      classification:
        beforeDetail?.status === "published" ? "sellability_affecting" : "editorial_only",
      before: beforeDetail,
      actorEmail,
      reason:
        beforeDetail?.status === "published"
          ? "A product was removed from the catalog. Review your order before continuing."
          : undefined,
    }),
  );
  if (!invalidation.ok) {
    console.warn("[admin catalog delete] storefront invalidation:", invalidation.error);
  }

  return correlatedJson(correlationId, {
    deleted: result.data.deleted,
    mutationClassification:
      beforeDetail?.status === "published" ? "sellability_affecting" : "editorial_only",
    storefrontInvalidation: invalidation.ok ? "ok" : invalidation.error,
  });
}
