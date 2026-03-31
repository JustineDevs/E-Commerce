import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { listCmsFormSubmissions } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";

function csvEscape(s: string) {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!staffSessionAllows(session, "content:read")) {
    return new Response("Forbidden", { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sp = req.nextUrl.searchParams;
  const result = await listCmsFormSubmissions(sup.client, {
    form_key: sp.get("form_key") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    limit: 5000,
    offset: 0,
  });
  const rows = Array.isArray(result) ? result : result.rows;
  const lines = [
    ["id", "form_key", "created_at", "read_at", "assigned_to", "spam_score", "payload_json"].join(","),
  ];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.form_key),
        csvEscape(r.created_at),
        csvEscape(r.read_at ?? ""),
        csvEscape(r.assigned_to ?? ""),
        String(r.spam_score),
        csvEscape(JSON.stringify(r.payload)),
      ].join(","),
    );
  }
  const body = lines.join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="form-submissions-${cid.slice(0, 8)}.csv"`,
    },
  });
}
