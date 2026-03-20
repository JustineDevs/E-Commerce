import { Router } from "express";

export const healthRouter: ReturnType<typeof Router> = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
