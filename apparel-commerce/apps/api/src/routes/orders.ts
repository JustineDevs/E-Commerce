import { Router } from "express";
import {
  createSupabaseClient,
  listOrders,
  getOrderById,
  getOrderByNumber,
  createOrder,
} from "@apparel-commerce/database";

export const ordersRouter: ReturnType<typeof Router> = Router();

ordersRouter.post("/", async (req, res) => {
  const body = req.body ?? {};
  const { channel = "pos", status = "paid", items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items array required" });
    return;
  }
  const supabase = createSupabaseClient();
  const result = await createOrder(supabase, {
    channel: channel === "web" ? "web" : "pos",
    status: String(status),
    items: items.map((i: { variantId: string; sku: string; productName: string; size: string; color: string; unitPrice: number; quantity: number }) => ({
      variantId: i.variantId,
      sku: i.sku,
      productName: i.productName,
      size: i.size,
      color: i.color,
      unitPrice: Number(i.unitPrice),
      quantity: Math.max(1, Math.floor(Number(i.quantity))),
    })),
  });
  res.status(201).json(result);
});

ordersRouter.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const status = req.query.status as string | undefined;
  const supabase = createSupabaseClient();
  const { orders, total } = await listOrders(supabase, { limit, offset, status });
  res.json({ orders, total });
});

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
