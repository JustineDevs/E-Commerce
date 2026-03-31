import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { upsertCmsRedirect } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "content:write")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const text = await req.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return correlatedJson(cid, { error: "CSV must include header and one row" }, { status: 400 });
  }
  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const fi = header.indexOf("from_path");
  const ti = header.indexOf("to_path");
  const si = header.indexOf("status_code");
  const ai = header.indexOf("active");
  const pi = header.indexOf("preserve_query");
  if (fi < 0 || ti < 0) {
    return correlatedJson(cid, { error: "CSV must include from_path and to_path columns" }, { status: 400 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const warnings: string[] = [];
  let imported = 0;
  for (let r = 1; r < lines.length; r++) {
    const cols = parseCsvLine(lines[r]!);
    const from_path = cols[fi]?.trim() ?? "";
    const to_path = cols[ti]?.trim() ?? "";
    if (!from_path || !to_path) {
      warnings.push(`Row ${r + 1}: skipped (empty path)`);
      continue;
    }
    const status_code = (Number(cols[si]) || 301) as 301 | 302 | 307 | 308;
    const active = ai < 0 ? true : cols[ai] === "1" || cols[ai]?.toLowerCase() === "true";
    const preserve_query =
      pi < 0 ? false : cols[pi] === "1" || cols[pi]?.toLowerCase() === "true";
    const { data: hit } = await sup.client
      .from("cms_redirects")
      .select("id")
      .eq("from_path", from_path.startsWith("/") ? from_path : `/${from_path}`)
      .maybeSingle();
    const existingId = hit ? String((hit as { id?: string }).id ?? "") : "";
    const row = await upsertCmsRedirect(sup.client, {
      id: existingId || undefined,
      from_path: from_path.startsWith("/") ? from_path : `/${from_path}`,
      to_path,
      status_code,
      active,
      preserve_query,
    });
    if (!row) warnings.push(`Row ${r + 1}: could not save ${from_path}`);
    else imported++;
  }
  return correlatedJson(cid, { data: { imported, warnings } });
}
