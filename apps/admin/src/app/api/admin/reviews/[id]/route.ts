import { requireStaffApiSession } from "@/lib/requireStaffSession";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

const WRITE_PERM = "content:write";

type ModerationBody = {
  status?: string;
  moderation_note?: string;
};

/**
 * Moderate a single review (approve, reject, hide). Staff: `content:write`.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const correlationId = getCorrelationId(req);
  const staff = await requireStaffApiSession(WRITE_PERM);
  if (!staff.ok) {
    return staff.response;
  }

  const { id } = await ctx.params;
  const reviewId = id?.trim();
  if (!reviewId) {
    return correlatedJson(correlationId, { error: "Missing id" }, { status: 400 });
  }

  let body: ModerationBody;
  try {
    body = (await req.json()) as ModerationBody;
  } catch {
    return correlatedJson(correlationId, { error: "Invalid JSON" }, { status: 400 });
  }

  const nextStatus = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (!["approved", "rejected", "hidden", "pending"].includes(nextStatus)) {
    return correlatedJson(
      correlationId,
      { error: "status must be pending, approved, rejected, or hidden" },
      { status: 400 },
    );
  }

  const note =
    typeof body.moderation_note === "string" ? body.moderation_note.trim().slice(0, 2000) : "";

  const sup = adminSupabaseOr503(correlationId);
  if ("response" in sup) {
    return sup.response;
  }

  const staffEmail = staff.session.user?.email?.trim() ?? "unknown";

  const { data, error } = await sup.client
    .from("product_reviews")
    .update({
      status: nextStatus,
      moderated_by_staff_email: staffEmail,
      moderated_at: new Date().toISOString(),
      moderation_note: note.length > 0 ? note : null,
    })
    .eq("id", reviewId)
    .select("id,status")
    .maybeSingle();

  if (error) {
    return correlatedJson(
      correlationId,
      { error: error.message, code: "REVIEW_UPDATE_FAILED" },
      { status: 502 },
    );
  }
  if (!data) {
    return correlatedJson(correlationId, { error: "Review not found" }, { status: 404 });
  }

  return correlatedJson(correlationId, { ok: true, review: data });
}
