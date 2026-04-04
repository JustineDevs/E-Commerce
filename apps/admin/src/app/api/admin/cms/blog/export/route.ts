import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { listCmsBlogPosts } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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
  const rows = await listCmsBlogPosts(sup.client);
  const ids = req.nextUrl.searchParams.get("ids")?.split(",").map((x) => x.trim()).filter(Boolean);
  const filtered = ids?.length ? rows.filter((r) => ids.includes(r.id)) : rows;

  const header = [
    "id",
    "slug",
    "locale",
    "title",
    "status",
    "published_at",
    "scheduled_publish_at",
    "author_name",
    "tags",
    "rss_include",
    "canonical_url",
    "og_image_url",
    "updated_at",
  ];
  const lines = [
    header.join(","),
    ...filtered.map((r) =>
      [
        r.id,
        r.slug,
        r.locale,
        r.title,
        r.status,
        r.published_at ?? "",
        r.scheduled_publish_at ?? "",
        r.author_name ?? "",
        r.tags.join(";"),
        r.rss_include ? "1" : "0",
        r.canonical_url ?? "",
        r.og_image_url ?? "",
        r.updated_at,
      ]
        .map((c) => csvEscape(String(c)))
        .join(","),
    ),
  ];
  const body = lines.join("\r\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="blog-posts.csv"',
    },
  });
}
