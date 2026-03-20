import { z } from "zod";

// Shared validation schemas

export const orderStatusSchema = z.enum([
  "draft",
  "pending_payment",
  "paid",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
