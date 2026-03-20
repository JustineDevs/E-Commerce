import { Router } from "express";
import { createSupabaseClient, lookupVariantByBarcode, lookupVariantBySku } from "@apparel-commerce/database";

export const barcodeRouter: ReturnType<typeof Router> = Router();

barcodeRouter.post("/lookup", async (req, res) => {
  const { barcode, sku } = req.body ?? {};
  const supabase = createSupabaseClient();

  if (barcode) {
    const variant = await lookupVariantByBarcode(supabase, String(barcode));
    if (variant) {
      res.json(variant);
      return;
    }
  }
  if (sku) {
    const variant = await lookupVariantBySku(supabase, String(sku));
    if (variant) {
      res.json(variant);
      return;
    }
  }

  res.status(404).json({ error: "Variant not found" });
});
