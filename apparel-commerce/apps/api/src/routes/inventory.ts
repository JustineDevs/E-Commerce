import { Router } from "express";
import { createSupabaseClient, listInventoryWithStock, getAvailableQty } from "@apparel-commerce/database";

export const inventoryRouter: ReturnType<typeof Router> = Router();

inventoryRouter.get("/", async (req, res) => {
  const supabase = createSupabaseClient();
  const rows = await listInventoryWithStock(supabase);
  res.json({ inventory: rows });
});

inventoryRouter.get("/available/:variantId", async (req, res) => {
  const { variantId } = req.params;
  const supabase = createSupabaseClient();

  const qty = await getAvailableQty(supabase, variantId);
  res.json({ variantId, available: qty });
});
