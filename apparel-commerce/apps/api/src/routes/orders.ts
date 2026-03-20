import { Router } from "express";
import {
  createSupabaseClient,
  listOrders,
  getOrderById,
  getOrderByNumber,
  createOrder,
  updateOrderStatusStaff,
} from "@apparel-commerce/database";
import { requireInternalApiKey } from "../lib/requireInternalApiKey.js";
import { logSecurityEvent } from "../lib/securityEvent.js";

export const ordersRouter: ReturnType<typeof Router> = Router();

ordersRouter.use(requireInternalApiKey);

ordersRouter.post("/", async (req, res, next) => {
  const body = req.body ?? {};
  const { channel = "pos", status = "paid", items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items array required" });
    return;
  }
  try {
    const supabase = createSupabaseClient();
    const result = await createOrder(supabase, {
      channel: channel === "web" ? "web" : "pos",
      status: String(status),
      items: items.map(
        (i: {
          variantId: string;
          sku: string;
          productName: string;
          size: string;
          color: string;
          unitPrice: number;
          quantity: number;
        }) => ({
          variantId: i.variantId,
          sku: i.sku,
          productName: i.productName,
          size: i.size,
          color: i.color,
          unitPrice: Number(i.unitPrice),
          quantity: Math.max(1, Math.floor(Number(i.quantity))),
        })
      ),
    });
    logSecurityEvent("order_created_internal_api", req, {
      channel: channel === "web" ? "web" : "pos",
      status: String(status),
      itemCount: items.length,
    });
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.startsWith("INVALID_ORDER_STATUS:")) {
        res.status(400).json({ error: "Invalid order status", code: "INVALID_ORDER_STATUS" });
        return;
      }
      if (e.message === "WEB_ORDER_INVALID_STATUS" || e.message === "POS_ORDER_MUST_BE_PAID") {
        res.status(400).json({ error: e.message, code: "INVALID_ORDER_STATUS" });
        return;
      }
    }
    next(e);
  }
});

ordersRouter.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const status = req.query.status as string | undefined;
  const supabase = createSupabaseClient();
  const { orders, total } = await listOrders(supabase, { limit, offset, status });
  res.json({ orders, total });
});

ordersRouter.patch("/:id", async (req, res, next) => {
  const { id } = req.params;
  const status = typeof req.body?.status === "string" ? req.body.status : "";
  if (!status) {
    res.status(400).json({ error: "status required", code: "INVALID_STATUS" });
    return;
  }
  try {
    const supabase = createSupabaseClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      res.status(400).json({ error: "Order id must be UUID", code: "INVALID_ID" });
      return;
    }
    await updateOrderStatusStaff(supabase, id, status);
    const order = await getOrderById(supabase, id);
    res.json(order);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "ORDER_NOT_FOUND") {
        res.status(404).json({ error: "Order not found", code: "ORDER_NOT_FOUND" });
        return;
      }
      if (e.message.startsWith("INVALID_STATUS_TRANSITION:")) {
        res.status(409).json({ error: "Invalid status transition", code: "INVALID_STATUS_TRANSITION" });
        return;
      }
    }
    next(e);
  }
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
