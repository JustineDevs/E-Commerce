import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import {
  createSupabaseClient,
  listProducts,
  getProductBySlug,
  listActiveCategorySummaries,
  listVariantFacets,
} from "@apparel-commerce/database";
import { productListQuerySchema } from "@apparel-commerce/validation";
import { logSecurityEvent } from "../lib/securityEvent.js";

export const productsRouter: ReturnType<typeof Router> = Router();

const catalogLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent("rate_limit_catalog", req, { window: "60s" });
    res.status(429).json({ error: "Too many requests", code: "RATE_LIMIT" });
  },
});

productsRouter.use(catalogLimiter);

productsRouter.get("/categories/summary", async (_req, res, next) => {
  try {
    const supabase = createSupabaseClient();
    const categories = await listActiveCategorySummaries(supabase);
    res.json({ categories });
  } catch (e) {
    next(e);
  }
});

productsRouter.get("/facets", async (req, res, next) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category.trim() : undefined;
    const supabase = createSupabaseClient();
    const facets = await listVariantFacets(supabase, { category: category || undefined });
    res.json(facets);
  } catch (e) {
    next(e);
  }
});

productsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = productListQuerySchema.safeParse({
      limit: req.query.limit,
      offset: req.query.offset,
      category: req.query.category,
      size: req.query.size,
      color: req.query.color,
      q: req.query.q,
      sort: req.query.sort,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid query",
        code: "INVALID_QUERY",
        details: parsed.error.flatten(),
      });
      return;
    }

    const q = parsed.data;
    const supabase = createSupabaseClient();
    const { products, total } = await listProducts(supabase, {
      limit: q.limit ?? 20,
      offset: q.offset ?? 0,
      category: q.category,
      size: q.size,
      color: q.color,
      search: q.q,
      sort: q.sort,
    });
    res.json({ products, total });
  } catch (e) {
    if (e instanceof Error && e.message === "CATALOG_TOO_LARGE") {
      res.status(503).json({
        error: "Catalog too large for this sort; contact support",
        code: "CATALOG_TOO_LARGE",
      });
      return;
    }
    next(e);
  }
});

productsRouter.get("/:slug", async (req, res, next) => {
  const { slug } = req.params;
  if (slug === "categories" || slug === "facets") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const supabase = createSupabaseClient();
    const product = await getProductBySlug(supabase, slug);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (e) {
    next(e);
  }
});
