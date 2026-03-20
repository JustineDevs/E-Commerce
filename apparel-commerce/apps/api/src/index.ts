import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requestIdMiddleware } from "./lib/requestId.js";
import { healthRouter } from "./routes/health.js";
import { productsRouter } from "./routes/products.js";
import { ordersRouter } from "./routes/orders.js";
import { inventoryRouter } from "./routes/inventory.js";
import { barcodeRouter } from "./routes/barcode.js";
import { paymentsRouter } from "./routes/payments.js";
import { shipmentsRouter } from "./routes/shipments.js";
import { checkoutRouter } from "./routes/checkout.js";
import { jobsRouter } from "./routes/jobs.js";
import { complianceRouter } from "./routes/compliance.js";
import { lemonsqueezyWebhookRouter } from "./routes/webhooks.lemonsqueezy.js";
import { aftershipWebhookRouter } from "./routes/webhooks.aftership.js";
import { publicOrdersRouter } from "./routes/publicOrders.js";
import { errorHandler } from "./lib/errorHandler.js";
import type { Request, Response } from "express";
import { logSecurityEvent } from "./lib/securityEvent.js";
import { legacyCommerceGate } from "./lib/legacyCommerceGate.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.set("trust proxy", process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true");

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  console.error("FATAL: INTERNAL_API_KEY is required in production");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !process.env.TRACKING_LINK_SECRET?.trim()) {
  console.error("FATAL: TRACKING_LINK_SECRET is required in production (order tracking tokens)");
  process.exit(1);
}

app.use(requestIdMiddleware);
app.use(legacyCommerceGate);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      const allowed =
        process.env.CORS_ORIGIN?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.length === 0) {
        if (process.env.NODE_ENV !== "production") {
          callback(null, true);
          return;
        }
        callback(null, false);
        return;
      }
      if (allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);

const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent("rate_limit_webhook", req, { window: "60s" });
    res.status(429).json({ error: "Too many requests", code: "RATE_LIMIT" });
  },
});

app.use(
  "/webhooks/lemonsqueezy",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  lemonsqueezyWebhookRouter
);
app.use(
  "/webhooks/aftership",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  aftershipWebhookRouter
);

app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/public/orders", publicOrdersRouter);
app.use("/checkout", checkoutRouter);
app.use("/jobs", jobsRouter);
app.use("/compliance", complianceRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);
app.use("/inventory", inventoryRouter);
app.use("/barcode", barcodeRouter);
app.use("/payments", paymentsRouter);
app.use("/shipments", shipmentsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
