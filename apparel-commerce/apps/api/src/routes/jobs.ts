import { Router } from "express";
import { createSupabaseClient, releaseExpiredReservations } from "@apparel-commerce/database";
import { requireInternalApiKey } from "../lib/requireInternalApiKey.js";

export const jobsRouter: ReturnType<typeof Router> = Router();

jobsRouter.use(requireInternalApiKey);

jobsRouter.post("/release-expired-reservations", async (req, res, next) => {
  try {
    const supabase = createSupabaseClient();
    const out = await releaseExpiredReservations(supabase);
    res.json(out);
  } catch (e) {
    next(e);
  }
});
