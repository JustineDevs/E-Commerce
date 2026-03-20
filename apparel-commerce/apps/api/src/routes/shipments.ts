import { Router } from "express";
import { createSupabaseClient, createStaffShipment, getShipmentsByOrderId } from "@apparel-commerce/database";
import { requireInternalApiKey } from "../lib/requireInternalApiKey.js";

export const shipmentsRouter: ReturnType<typeof Router> = Router();

shipmentsRouter.use(requireInternalApiKey);

shipmentsRouter.post("/", async (req, res, next) => {
  const body = req.body ?? {};
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber : "";
  const carrierSlug = typeof body.carrierSlug === "string" ? body.carrierSlug : undefined;
  const labelUrl = typeof body.labelUrl === "string" ? body.labelUrl : undefined;
  if (!orderId || !trackingNumber.trim()) {
    res.status(400).json({ error: "orderId and trackingNumber required", code: "INVALID_SHIPMENT" });
    return;
  }
  try {
    const supabase = createSupabaseClient();
    const result = await createStaffShipment(supabase, { orderId, trackingNumber, carrierSlug, labelUrl });
    res.status(201).json(result);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "ORDER_NOT_FOUND") {
        res.status(404).json({ error: "Order not found", code: "ORDER_NOT_FOUND" });
        return;
      }
      if (e.message === "ORDER_NOT_FULFILLABLE") {
        res.status(409).json({ error: "Order cannot accept shipments in current status", code: "NOT_FULFILLABLE" });
        return;
      }
      if (e.message === "TRACKING_NUMBER_EXISTS") {
        res.status(409).json({ error: "Tracking number already exists", code: "DUPLICATE_TRACKING" });
        return;
      }
      if (e.message === "TRACKING_NUMBER_REQUIRED") {
        res.status(400).json({ error: "trackingNumber required", code: "INVALID_SHIPMENT" });
        return;
      }
    }
    next(e);
  }
});

shipmentsRouter.get("/order/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const supabase = createSupabaseClient();

  const shipments = await getShipmentsByOrderId(supabase, orderId);
  res.json(shipments);
});
