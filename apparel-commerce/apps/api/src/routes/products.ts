import { Router } from "express";
import { createSupabaseClient, listProducts, getProductBySlug } from "@apparel-commerce/database";

export const productsRouter: ReturnType<typeof Router> = Router();

productsRouter.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const category = req.query.category as string | undefined;

  const supabase = createSupabaseClient();
  const { products, total } = await listProducts(supabase, { limit, offset, category });
  res.json({ products, total });
});

productsRouter.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const supabase = createSupabaseClient();
  const product = await getProductBySlug(supabase, slug);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});
