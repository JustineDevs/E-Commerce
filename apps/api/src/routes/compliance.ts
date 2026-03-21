import { Router } from "express";
import {
  createSupabaseClient,
  exportDataSubjectByEmail,
  anonymizeStaleOrderAddresses,
} from "@apparel-commerce/database";

export const complianceRouter: ReturnType<typeof Router> = Router();

complianceRouter.get("/export", async (req, res, next) => {
  try {
    const email =
      typeof req.query.email === "string" ? req.query.email.trim() : "";
    if (!email) {
      res
        .status(400)
        .json({ error: "email query required", code: "MISSING_EMAIL" });
      return;
    }
    const supabase = createSupabaseClient();
    const bundle = await exportDataSubjectByEmail(supabase, email);
    if (!bundle) {
      res.status(404).json({ error: "subject not found", code: "NOT_FOUND" });
      return;
    }
    res.json(bundle);
  } catch (e) {
    next(e);
  }
});

complianceRouter.post(
  "/retention/anonymize-addresses",
  async (req, res, next) => {
    try {
      const days = Math.min(
        parseInt(
          String(req.body?.days ?? process.env.DATA_RETENTION_DAYS ?? "730"),
          10,
        ) || 730,
        365 * 10,
      );
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const supabase = createSupabaseClient();
      const out = await anonymizeStaleOrderAddresses(
        supabase,
        cutoff.toISOString(),
      );
      res.json({ ...out, cutoff: cutoff.toISOString(), days });
    } catch (e) {
      next(e);
    }
  },
);
