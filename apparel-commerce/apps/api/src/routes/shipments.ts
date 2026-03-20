import { Router } from "express";
import { createSupabaseClient, getShipmentsByOrderId } from "@apparel-commerce/database";

export const shipmentsRouter: ReturnType<typeof Router> = Router();

shipmentsRouter.get("/order/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const supabase = createSupabaseClient();

  const shipments = await getShipmentsByOrderId(supabase, orderId);
  res.json(shipments);
});
