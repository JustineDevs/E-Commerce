import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { productsRouter } from "./routes/products.js";
import { ordersRouter } from "./routes/orders.js";
import { inventoryRouter } from "./routes/inventory.js";
import { barcodeRouter } from "./routes/barcode.js";
import { paymentsRouter } from "./routes/payments.js";
import { shipmentsRouter } from "./routes/shipments.js";
import { lemonsqueezyWebhookRouter } from "./routes/webhooks.lemonsqueezy.js";
import { aftershipWebhookRouter } from "./routes/webhooks.aftership.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);
app.use("/inventory", inventoryRouter);
app.use("/barcode", barcodeRouter);
app.use("/payments", paymentsRouter);
app.use("/shipments", shipmentsRouter);
app.use("/webhooks/lemonsqueezy", lemonsqueezyWebhookRouter);
app.use("/webhooks/aftership", aftershipWebhookRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
