"use client";

import type {
  CatalogProductDetail,
  CatalogVariantStockRow,
} from "@/lib/medusa-catalog-service";
import { useAdminToast } from "@/components/admin-console";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RelatedProductsPicker } from "./RelatedProductsPicker";
import { VariantMatrixField } from "./VariantMatrixField";

type CategoryOption = { id: string; name: string; handle: string };

function parseImageUrlsFlexible(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitCarouselVideos(text: string): {
  videoUrl: string | null;
  galleryVideoUrlsText: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { videoUrl: null, galleryVideoUrlsText: "" };
  const [first, ...rest] = lines;
  return {
    videoUrl: first ?? null,
    galleryVideoUrlsText: rest.join("\n"),
  };
}

function buildCarouselVideosInitial(
  sm: CatalogProductDetail["storefrontMetadata"] | null | undefined,
): string {
  if (!sm) return "";
  const lines: string[] = [];
  const v = sm.videoUrl?.trim();
  if (v) lines.push(v);
  const extra = sm.galleryVideoUrlsText?.trim();
  if (extra) {
    for (const line of extra.split(/\r?\n/)) {
      const t = line.trim();
      if (t) lines.push(t);
    }
  }
  return lines.join("\n");
}

function parseStrictStockUnits(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "") return { ok: false, error: "Enter stock quantity." };
  if (!/^\d+$/.test(t)) {
    return {
      ok: false,
      error: "Stock must be a whole number (0 or greater).",
    };
  }
  const n = Number(t);
  if (!Number.isSafeInteger(n) || n < 0) {
    return {
      ok: false,
      error: "Stock must be a whole number (0 or greater).",
    };
  }
  return { ok: true, value: n };
}

function matrixCellKey(size: string, color: string): string {
  return `${size.trim()}\u0000${color.trim()}`;
}

function filterVariantStockRowsForMatrix(
  rows: CatalogVariantStockRow[],
  sizes: string[],
  colors: string[],
): CatalogVariantStockRow[] {
  const allowed = new Set<string>();
  for (const sz of sizes) {
    for (const col of colors) {
      allowed.add(matrixCellKey(sz, col));
    }
  }
  return rows.filter((r) =>
    allowed.has(matrixCellKey(r.sizeLabel, r.colorLabel)),
  );
}

function initialDefaultMatrixStock(product: CatalogProductDetail): string {
  if (product.variantStockRows.length <= 1) return "0";
  const nums = product.variantStockRows
    .map((r) => r.stockedQuantity)
    .filter((n): n is number => n != null);
  if (nums.length > 0 && nums.every((n) => n === nums[0])) {
    return String(nums[0]);
  }
  return "0";
}

type Props =
  | { mode: "create"; regionCurrencyCode?: string }
  | { mode: "edit"; product: CatalogProductDetail };

export function ProductEditorForm(props: Props) {
  const router = useRouter();
  const toast = useAdminToast();
  const isEdit = props.mode === "edit";
  const p = isEdit ? props.product : null;
  const createCurrency =
    props.mode === "create" ? (props.regionCurrencyCode ?? "php") : "php";

  const [title, setTitle] = useState(p?.title ?? "");
  const [handle, setHandle] = useState(p?.handle ?? "");
  const [description, setDescription] = useState(p?.description ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (p?.status === "published" ? "published" : "draft") as "draft" | "published",
  );
  const [pricePhp, setPricePhp] = useState(
    p?.pricePhp != null ? String(p.pricePhp) : "",
  );
  const [sku, setSku] = useState(p?.sku ?? "");
  const [imageUrlsText, setImageUrlsText] = useState(() => {
    if (p?.imageUrls?.length) return p.imageUrls.join("\n");
    return (p?.thumbnail ?? "").trim();
  });
  const [categoryIds, setCategoryIds] = useState<string[]>(p?.categoryIds ?? []);
  const [stockQuantity, setStockQuantity] = useState(() => {
    if (!isEdit || !p) return "0";
    if (p.variantStockRows.length > 1) return "0";
    if (p.stockQuantity != null) return String(p.stockQuantity);
    const first = p.variantStockRows[0]?.stockedQuantity;
    if (first != null) return String(first);
    return "0";
  });
  const [variantStockById, setVariantStockById] = useState<
    Record<string, string>
  >(() =>
    isEdit && p
      ? Object.fromEntries(
          p.variantStockRows.map((r) => [
            r.variantId,
            r.stockedQuantity != null ? String(r.stockedQuantity) : "0",
          ]),
        )
      : {},
  );
  const [defaultMatrixStock, setDefaultMatrixStock] = useState(() =>
    isEdit && p ? initialDefaultMatrixStock(p) : "0",
  );
  const sm = isEdit ? p?.storefrontMetadata : null;
  const [brand, setBrand] = useState(sm?.brand ?? "");
  const [carouselVideosText, setCarouselVideosText] = useState(() =>
    buildCarouselVideosInitial(sm ?? null),
  );
  const [weightKg, setWeightKg] = useState(
    sm?.weightKg != null ? String(sm.weightKg) : "",
  );
  const [dimensionsLabel, setDimensionsLabel] = useState(
    sm?.dimensionsLabel ?? "",
  );
  const [material, setMaterial] = useState(sm?.material ?? "");
  const [lifestyleImageUrl, setLifestyleImageUrl] = useState(
    sm?.lifestyleImageUrl ?? "",
  );
  const [seoDescription, setSeoDescription] = useState(sm?.seoDescription ?? "");
  const [relatedHandlesText, setRelatedHandlesText] = useState(
    sm?.relatedHandlesText ?? "",
  );
  const [matrixSizes, setMatrixSizes] = useState<string[]>(() =>
    isEdit && p?.matrixSizes?.length ? [...p.matrixSizes] : [],
  );
  const [matrixColors, setMatrixColors] = useState<string[]>(() =>
    isEdit && p?.matrixColors?.length ? [...p.matrixColors] : [],
  );
  const [hotspotsJson, setHotspotsJson] = useState(sm?.hotspotsJson ?? "");
  const [variantBarcode, setVariantBarcode] = useState(
    isEdit && p?.variantBarcode ? p.variantBarcode : "",
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryHandle, setNewCategoryHandle] = useState("");
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [categoryCreateError, setCategoryCreateError] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/catalog/categories")
      .then((r) => r.json())
      .then((body: { categories?: CategoryOption[] }) => {
        if (!cancelled && Array.isArray(body.categories)) {
          setCategories(body.categories);
        }
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const variantComboCount = matrixSizes.length * matrixColors.length;
  const showPerVariantStock = Boolean(
    isEdit &&
      p &&
      variantComboCount > 1 &&
      p.variantStockRows.length > 0,
  );

  const stockRowsFingerprint =
    isEdit && p
      ? p.variantStockRows
          .map((r) => `${r.variantId}:${r.stockedQuantity ?? "x"}`)
          .join("|")
      : "";

  useEffect(() => {
    if (!isEdit || !p) return;
    setVariantStockById(
      Object.fromEntries(
        p.variantStockRows.map((r) => [
          r.variantId,
          r.stockedQuantity != null ? String(r.stockedQuantity) : "0",
        ]),
      ),
    );
    setDefaultMatrixStock(initialDefaultMatrixStock(p));
  }, [isEdit, p?.id, stockRowsFingerprint]);

  const visibleVariantStockRows = useMemo(() => {
    if (!isEdit || !p || !showPerVariantStock) return [];
    return filterVariantStockRowsForMatrix(
      p.variantStockRows,
      matrixSizes,
      matrixColors,
    );
  }, [
    isEdit,
    p?.id,
    showPerVariantStock,
    matrixSizes,
    matrixColors,
    stockRowsFingerprint,
  ]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function createStoreCategory() {
    setCategoryCreateError(null);
    const nm = newCategoryName.trim();
    if (!nm) {
      setCategoryCreateError("Enter a category name.");
      return;
    }
    setCategoryCreating(true);
    try {
      const res = await fetch("/api/admin/catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nm,
          handle: newCategoryHandle.trim() || undefined,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        category?: CategoryOption;
      };
      if (!res.ok) {
        setCategoryCreateError(j.error ?? "Could not create category.");
        return;
      }
      if (j.category?.id) {
        const cat = j.category;
        setCategories((prev) => {
          if (prev.some((c) => c.id === cat.id)) return prev;
          return [...prev, cat].sort((a, b) => a.name.localeCompare(b.name));
        });
        setCategoryIds((prev) =>
          prev.includes(cat.id) ? prev : [...prev, cat.id],
        );
        setNewCategoryName("");
        setNewCategoryHandle("");
      }
    } catch {
      setCategoryCreateError("Network unavailable.");
    } finally {
      setCategoryCreating(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const priceNum = parseFloat(pricePhp);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Enter a valid price.");
      setSaving(false);
      return;
    }

    let stockQtyInt: number;
    let variantStocksPayload:
      | Array<{ variantId: string; quantity: number }>
      | undefined;

    if (showPerVariantStock && p) {
      const defaultParsed = parseStrictStockUnits(defaultMatrixStock);
      if (!defaultParsed.ok) {
        setError(defaultParsed.error);
        setSaving(false);
        return;
      }
      stockQtyInt = defaultParsed.value;
      const visible = filterVariantStockRowsForMatrix(
        p.variantStockRows,
        matrixSizes,
        matrixColors,
      );
      variantStocksPayload = [];
      for (const row of visible) {
        const raw = variantStockById[row.variantId] ?? "0";
        const rowParsed = parseStrictStockUnits(raw);
        if (!rowParsed.ok) {
          setError(`${row.label}: ${rowParsed.error}`);
          setSaving(false);
          return;
        }
        variantStocksPayload.push({
          variantId: row.variantId,
          quantity: rowParsed.value,
        });
      }
    } else {
      const stockParsed = parseStrictStockUnits(stockQuantity);
      if (!stockParsed.ok) {
        setError(stockParsed.error);
        setSaving(false);
        return;
      }
      stockQtyInt = stockParsed.value;
      variantStocksPayload = undefined;
    }

    if (matrixSizes.length < 1 || matrixColors.length < 1) {
      setError("Select at least one size and one color.");
      setSaving(false);
      return;
    }
    const combos = matrixSizes.length * matrixColors.length;
    if (combos > 80) {
      setError(`Too many variants (${combos}). Maximum is 80.`);
      setSaving(false);
      return;
    }

    const { videoUrl, galleryVideoUrlsText } =
      splitCarouselVideos(carouselVideosText);

    const storefrontMetadata = {
      brand: brand.trim() || null,
      videoUrl,
      galleryVideoUrlsText,
      weightKg: (() => {
        const w = weightKg.trim();
        if (!w) return null;
        const n = Number(w);
        return Number.isFinite(n) ? n : null;
      })(),
      dimensionsLabel: dimensionsLabel.trim() || null,
      material: material.trim() || null,
      lifestyleImageUrl: lifestyleImageUrl.trim() || null,
      seoDescription: seoDescription.trim() || null,
      relatedHandlesText,
      hotspotsJson,
    };

    const imageUrls = parseImageUrlsFlexible(imageUrlsText);

    const sharedPayload = {
      title: title.trim(),
      handle: handle.trim(),
      description: description.trim() || null,
      status,
      pricePhp: priceNum,
      imageUrls,
      categoryIds,
      stockQuantity: stockQtyInt,
      storefrontMetadata,
    };

    try {
      if (isEdit && p) {
        const patchBody: Record<string, unknown> = {
          ...sharedPayload,
          sizeLabels: matrixSizes,
          colorLabels: matrixColors,
        };
        if (combos > 1) {
          patchBody.sku = null;
          patchBody.variantBarcode = null;
        } else {
          patchBody.sku = sku.trim() || null;
          patchBody.variantBarcode = variantBarcode.trim() || null;
        }
        if (variantStocksPayload?.length) {
          patchBody.variantStocks = variantStocksPayload;
        }
        const res = await fetch(`/api/admin/catalog/products/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });
        const j = (await res.json()) as { error?: string };
        if (!res.ok) {
          const msg = j.error ?? "Unable to save changes";
          setError(msg);
          toast.push(msg, "error");
          setSaving(false);
          return;
        }
        toast.push("Changes saved. Returning to the product list.", "success");
        router.push("/admin/catalog?flash=updated");
        router.refresh();
        return;
      }

      const res = await fetch("/api/admin/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sharedPayload,
          handle: handle.trim() || undefined,
          description: description.trim() || undefined,
          sku: combos > 1 ? undefined : sku.trim() || undefined,
          variantBarcode:
            combos > 1 ? null : variantBarcode.trim() || null,
          sizeLabels: matrixSizes,
          colorLabels: matrixColors,
          sizeLabel: undefined,
          colorLabel: undefined,
        }),
      });
      const j = (await res.json()) as { error?: string; productId?: string };
      if (!res.ok) {
        const msg = j.error ?? "Unable to create product";
        setError(msg);
        toast.push(msg, "error");
        setSaving(false);
        return;
      }
      if (j.productId) {
        toast.push("Product created. Opening the product list.", "success");
        router.push("/admin/catalog?flash=created");
        router.refresh();
      }
    } catch {
      const msg = "Network unavailable. Check your connection and try again.";
      setError(msg);
      toast.push(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit || !p) return;
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalog/products/${p.id}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        const msg = j.error ?? "Unable to delete product";
        setError(msg);
        toast.push(msg, "error");
        setDeleting(false);
        return;
      }
      toast.push("Product removed from the catalog.", "success");
      router.push("/admin/catalog?flash=deleted");
      router.refresh();
    } catch {
      const msg = "Network unavailable. Check your connection and try again.";
      setError(msg);
      toast.push(msg, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="max-w-2xl space-y-6">
      {isEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/catalog"
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/35 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition hover:bg-surface-container-low"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center" aria-hidden>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M11.78 4.22a.75.75 0 0 1 0 1.06L7.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06l-5.25-5.25a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            Back to products
          </Link>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
        >
          {error}
        </div>
      ) : null}

      {saving ? (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface"
        >
          <span className="inline-flex items-center gap-2 font-medium text-on-surface">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden
            />
            Saving to catalog…
          </span>
        </div>
      ) : null}

      {deleting ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent"
              aria-hidden
            />
            Removing product…
          </span>
        </div>
      ) : null}

      <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
        <p className="font-medium text-on-surface">Shop</p>
        <p className="mt-1 leading-relaxed">
          Published items show on the public catalog. Categories drive the category filter. Size and
          color are saved as Medusa options and match storefront filters. Tick every size and color
          you need. Each combination is a sellable variant. Editing uses the same matrix as create.
        </p>
      </div>

      {status === "draft" ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <strong>Draft</strong> keeps the product out of the live shop. Shoppers only see items that
          are <strong>Published</strong> and included in the same selling channel as your online
          store.
        </div>
      ) : null}

      {status === "published" ? (
        <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
          The live site only lists products that belong to its selling channel. Saving here adds or
          keeps that link when your store is connected. If an item is missing online, confirm it is
          published here and included in the channel in the full store admin.
        </div>
      ) : null}

      {isEdit && p && !p.shopVariantOptionsReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This product did not use Size + Color options yet. Saving from this screen adds those
          options and rebuilds variants from the matrix below. Per-variant SKU and barcode stay in
          your store admin when you keep more than one variant.
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Title
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Web address (handle)
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm font-mono"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="auto from title if empty"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Description
        </label>
        <textarea
          className="mt-2 w-full min-h-[120px] rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={50000}
        />
      </div>

      <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low px-4 py-3 space-y-4">
        <div>
          <p className="font-medium text-on-surface">Public product details</p>
          <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
            Optional extras for the public product page: brand, video, specs, related items, search
            description, and interactive hotspots. Use the hotspots field only if your theme reads
            that data.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Brand
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Shown on PDP and shop filters"
              maxLength={200}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              SEO description
            </label>
            <textarea
              className="mt-2 w-full min-h-[72px] rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Optional. Overrides auto-truncated description in meta tags."
              maxLength={500}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Gallery videos (after product images)
            </label>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              One URL per line. The first line is the primary carousel clip. The rest follow in order.
              YouTube watch URLs, youtu.be, and direct mp4 or webm links are supported by the storefront
              player.
            </p>
            <textarea
              className="mt-2 w-full min-h-[120px] rounded-lg border border-outline-variant/30 px-3 py-2 font-mono text-xs"
              value={carouselVideosText}
              onChange={(e) => setCarouselVideosText(e.target.value)}
              placeholder={
                "https://www.youtube.com/watch?v=...\nhttps://example.com/second.mp4\nhttps://example.com/third.webm"
              }
              maxLength={8000}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Weight (kg)
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 0.35"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Dimensions label
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              value={dimensionsLabel}
              onChange={(e) => setDimensionsLabel(e.target.value)}
              placeholder="e.g. 40 x 30 x 5 cm"
              maxLength={200}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Material
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Fabric composition"
              maxLength={500}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Lifestyle image URL
            </label>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              https, http, protocol-relative, site-relative paths, or data:image URLs.
            </p>
            <input
              type="text"
              className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              value={lifestyleImageUrl}
              onChange={(e) => setLifestyleImageUrl(e.target.value)}
              placeholder="https://… or /images/lookbook.jpg or data:image/png;base64,…"
              maxLength={2000}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Related products
            </label>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Search the catalog and add handles, or edit the list below. Handles must match product
              web slugs shown on the shop.
            </p>
            <div className="mt-2">
              <RelatedProductsPicker
                valueText={relatedHandlesText}
                onChangeText={setRelatedHandlesText}
                excludeHandle={isEdit && p ? p.handle : undefined}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Hotspots JSON
            </label>
            <textarea
              className="mt-2 w-full min-h-[120px] rounded-lg border border-outline-variant/30 px-3 py-2 font-mono text-xs"
              value={hotspotsJson}
              onChange={(e) => setHotspotsJson(e.target.value)}
              placeholder='[{"xPct":20,"yPct":40,"productSlug":"other-handle","label":"Optional"}]'
              maxLength={10000}
            />
          </div>
        </div>
      </div>

      <div>
        <span className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Categories (shop filter)
        </span>
        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          Tick categories for this product. Add a new shop category below when you need a label that
          is not in the list yet.
        </p>
        {!categoriesLoaded ? (
          <p className="mt-2 text-sm text-on-surface-variant">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">
            No categories yet. Add one below, or create more in your store admin.
          </p>
        ) : (
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-outline-variant/20 bg-white p-3">
            {categories.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                  />
                  <span>{c.name}</span>
                  <span className="font-mono text-xs text-on-surface-variant">{c.handle}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 rounded-lg border border-outline-variant/20 bg-surface-container-low/60 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Add shop category
          </p>
          {categoryCreateError ? (
            <p className="text-xs text-red-700" role="alert">
              {categoryCreateError}
            </p>
          ) : null}
          <input
            className="w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
            placeholder="Name (e.g. Summer shorts)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            maxLength={200}
            aria-label="New category name"
          />
          <input
            className="w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm font-mono"
            placeholder="Web slug (optional, auto if empty)"
            value={newCategoryHandle}
            onChange={(e) => setNewCategoryHandle(e.target.value)}
            maxLength={200}
            aria-label="New category handle"
          />
          <button
            type="button"
            disabled={categoryCreating}
            className="rounded-lg border border-outline-variant/30 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide disabled:opacity-50"
            onClick={() => void createStoreCategory()}
          >
            {categoryCreating ? "Creating…" : "Create and select"}
          </button>
        </div>
      </div>

      <VariantMatrixField
        sizes={matrixSizes}
        colors={matrixColors}
        onSizesChange={setMatrixSizes}
        onColorsChange={setMatrixColors}
      />

      <div
        className={`grid grid-cols-1 gap-6 ${showPerVariantStock ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Status
          </label>
          <select
            className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value === "published" ? "published" : "draft")
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Price ({isEdit && p ? p.currencyCode.toUpperCase() : createCurrency.toUpperCase()})
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
            value={pricePhp}
            onChange={(e) => setPricePhp(e.target.value)}
            required
          />
        </div>
        {!showPerVariantStock ? (
          <div>
            <label
              htmlFor="catalog-product-stock"
              className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Stock (units)
            </label>
            <p
              id="catalog-stock-help"
              className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:hidden"
            >
              Stocked units at the first warehouse this app uses. Reserved units (open carts) can
              make sellable availability lower. Other warehouses are set in the full store admin.
              {variantComboCount > 1
                ? " Matrix create: the same quantity is applied to every variant."
                : ""}
            </p>
            <input
              id="catalog-product-stock"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              value={stockQuantity}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "");
                setStockQuantity(next);
              }}
              required
              aria-describedby="catalog-stock-help catalog-stock-help-wide"
            />
            <p
              id="catalog-stock-help-wide"
              className="mt-1 hidden text-xs leading-relaxed text-on-surface-variant sm:block"
            >
              Stocked units at the first warehouse for this workspace. Sellable stock can be lower
              when units are reserved. Other locations are set in the full store admin.
              {variantComboCount > 1
                ? " When you create a matrix, this quantity is applied to every variant."
                : ""}
            </p>
          </div>
        ) : null}
      </div>

      {showPerVariantStock ? (
        <div className="space-y-4 rounded-lg border border-outline-variant/25 bg-surface-container-low px-4 py-4">
          <div>
            <span className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Stock by variant (warehouse)
            </span>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Stocked quantity at the first warehouse for each size and color. Rows match your
              matrix. If inventory data failed to load for a row, you can still enter a whole
              number and save.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-outline-variant/20 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low/80">
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Variant
                  </th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Stock (units)
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleVariantStockRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-3 text-on-surface-variant"
                    >
                      No variants match the current matrix. Adjust sizes and colors above, or save
                      to sync variants.
                    </td>
                  </tr>
                ) : (
                  visibleVariantStockRows.map((row) => (
                    <tr
                      key={row.variantId}
                      className="border-b border-outline-variant/15 last:border-0"
                    >
                      <td className="px-3 py-2 align-middle text-on-surface">
                        {row.label}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          className="w-28 rounded-lg border border-outline-variant/30 px-2 py-1.5 font-mono text-sm"
                          value={variantStockById[row.variantId] ?? "0"}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, "");
                            setVariantStockById((prev) => ({
                              ...prev,
                              [row.variantId]: next,
                            }));
                          }}
                          aria-label={`Stock for ${row.label}`}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div>
            <label
              htmlFor="catalog-default-matrix-stock"
              className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Default stock for new combinations
            </label>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              When you add a size or color and save, any new variant uses this stocked quantity
              until you change it in the table after reload.
            </p>
            <input
              id="catalog-default-matrix-stock"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="mt-2 w-full max-w-xs rounded-lg border border-outline-variant/30 px-3 py-2 text-sm sm:max-w-sm"
              value={defaultMatrixStock}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "");
                setDefaultMatrixStock(next);
              }}
              required
              aria-describedby="catalog-default-matrix-stock-help"
            />
            <p
              id="catalog-default-matrix-stock-help"
              className="mt-1 text-xs text-on-surface-variant"
            >
              Applies to variants created on this save that are not listed above yet.
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="catalog-product-sku"
          className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
        >
          SKU (optional)
        </label>
        <p
          id="catalog-sku-help"
          className="mt-1 text-xs leading-relaxed text-on-surface-variant"
        >
          Stock keeping unit: your own code for this variant (warehouse bins, barcode labels, packing
          slips, POS search). Leave empty to skip a SKU on create; you can add one later in your
          store admin.
        </p>
        {variantComboCount > 1 ? (
          <p className="mt-2 text-xs text-on-surface-variant">
            Matrix products skip SKU and barcode here. Assign per variant in the full store admin.
          </p>
        ) : null}
        <input
          id="catalog-product-sku"
          className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm font-mono"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          maxLength={120}
          placeholder="e.g. MAC-TEE-BLK-M"
          aria-describedby="catalog-sku-help"
          disabled={variantComboCount > 1}
        />
      </div>

      <div>
        <label
          htmlFor="catalog-variant-barcode"
          className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
        >
          Barcode (optional)
        </label>
        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          UPC, EAN, or internal scancode for this item when your checkout or devices read it.
        </p>
        <input
          id="catalog-variant-barcode"
          className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm font-mono"
          value={variantBarcode}
          onChange={(e) => setVariantBarcode(e.target.value)}
          maxLength={120}
          placeholder="Numeric or alphanumeric"
          disabled={variantComboCount > 1}
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Image URLs (optional)
        </label>
        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          One URL per line, or several URLs separated by commas on one line. The first image is the
          main thumbnail. https, http, protocol-relative (//), site paths (/media/…), and data:image
          URLs are accepted when safe.
        </p>
        <textarea
          className="mt-2 w-full min-h-[120px] rounded-lg border border-outline-variant/30 px-3 py-2 font-mono text-xs"
          value={imageUrlsText}
          onChange={(e) => setImageUrlsText(e.target.value)}
          placeholder={"https://cdn.example.com/front.jpg\nhttps://cdn.example.com/back.jpg"}
          maxLength={16000}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={saving || deleting}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-outline-variant/30 px-6 py-2.5 text-sm font-medium text-on-surface-variant"
          onClick={() => router.push("/admin/catalog")}
        >
          Cancel
        </button>
        {isEdit ? (
          <button
            type="button"
            disabled={deleting || saving}
            className="ml-auto rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-900 disabled:opacity-50"
            onClick={() => void remove()}
          >
            {deleting ? "Deleting…" : "Delete product"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
