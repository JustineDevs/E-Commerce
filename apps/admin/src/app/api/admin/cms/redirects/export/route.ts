import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { listCmsRedirects } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";

function esc(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!staffSessionAllows(session, "content:read")) return new Response("Forbidden", { status: 403 });
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const rows = await listCmsRedirects(sup.client);
  const lines = [
    ["from_path", "to_path", "status_code", "active", "preserve_query"].join(","),
  ];
  for (const r of rows) {
    lines.push(
      [
        esc(r.from_path),
        esc(r.to_path),
        String(r.status_code),
        r.active ? "1" : "0",
        r.preserve_query ? "1" : "0",
      ].join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cms-redirects-${cid.slice(0, 8)}.csv"`,
    },
  });
}
