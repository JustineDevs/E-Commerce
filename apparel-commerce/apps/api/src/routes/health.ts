import { Router } from "express";

export const healthRouter: ReturnType<typeof Router> = Router();

healthRouter.get("/commerce", async (_req, res) => {
  const medusaBase = process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "") ?? "";
  let medusaStatus: string = "not_configured";
  if (medusaBase) {
    try {
      const r = await fetch(`${medusaBase}/health`);
      medusaStatus = r.ok ? "ok" : `http_${r.status}`;
    } catch {
      medusaStatus = "unreachable";
    }
  }
  res.json({
    commerceEngine: "medusa",
    medusa: medusaBase ? { url: medusaBase, status: medusaStatus } : null,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/", async (_req, res) => {
  const medusaBase = process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "") ?? "";
  let medusaOk = false;
  if (medusaBase) {
    try {
      const r = await fetch(`${medusaBase}/health`);
      medusaOk = r.ok;
    } catch {
      medusaOk = false;
    }
  }
  const status = medusaOk ? "ok" : medusaBase ? "degraded" : "no_medusa";
  const code = status === "ok" ? 200 : 503;
  res.status(code).json({
    status,
    medusa: medusaOk ? "ok" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});
