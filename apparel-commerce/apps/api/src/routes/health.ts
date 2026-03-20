import { Router } from "express";
import { createSupabaseClient } from "@apparel-commerce/database";

export const healthRouter: ReturnType<typeof Router> = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("products").select("id").limit(1);
    if (error) {
      res.status(503).json({
        status: "degraded",
        db: "unavailable",
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.json({
      status: "ok",
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      db: "unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});
