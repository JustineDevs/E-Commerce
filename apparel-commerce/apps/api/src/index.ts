import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestIdMiddleware } from "./lib/requestId.js";
import { healthRouter } from "./routes/health.js";
import { complianceRouter } from "./routes/compliance.js";
import { errorHandler } from "./lib/errorHandler.js";
import { requireInternalApiKey } from "./lib/requireInternalApiKey.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.set(
  "trust proxy",
  process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true",
);

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  console.error("FATAL: INTERNAL_API_KEY must be set in production");
  process.exit(1);
}

app.use(requestIdMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
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
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/compliance", requireInternalApiKey, complianceRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
