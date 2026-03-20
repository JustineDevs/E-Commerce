import { Router } from "express";
import { createSupabaseClient, getOrderById, getOrderByNumber } from "@apparel-commerce/database";

export const ordersRouter: ReturnType<typeof Router> = Router();

ordersRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  const supabase = createSupabaseClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const order = isUuid
    ? await getOrderById(supabase, id)
    : await getOrderByNumber(supabase, id);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});
