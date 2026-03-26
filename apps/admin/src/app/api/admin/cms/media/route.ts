import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import { insertCmsMedia, listCmsMedia } from "@apparel-commerce/platform-data";
import { adminSupabaseOr503 } from "@/lib/require-admin-supabase";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function GET(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffHasPermission(session.user.permissions ?? [], "content:read")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const data = await listCmsMedia(sup.client);
  return correlatedJson(cid, { data });
}

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffHasPermission(session.user.permissions ?? [], "content:write")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const sb = sup.client;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return correlatedJson(cid, { error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  const altText = typeof form.get("alt") === "string" ? (form.get("alt") as string) : "";
  if (!(file instanceof Blob) || file.size === 0) {
    return correlatedJson(cid, { error: "Missing file" }, { status: 400 });
  }

  const rawName = typeof (file as File).name === "string" ? (file as File).name : "upload";
  const safe = rawName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  const path = `public/${crypto.randomUUID()}-${safe}`;

  const ab = await file.arrayBuffer();
  const { error: upErr } = await sb.storage.from("cms").upload(path, ab, {
    contentType: (file as File).type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) {
    return correlatedJson(cid, { error: upErr.message }, { status: 500 });
  }

  const { data: pub } = sb.storage.from("cms").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const row = await insertCmsMedia(sb, {
    storage_path: path,
    public_url: publicUrl,
    alt_text: altText || null,
    mime_type: (file as File).type || null,
    width: null,
    height: null,
  });
  if (!row) return correlatedJson(cid, { error: "Unable to save metadata" }, { status: 500 });
  return correlatedJson(cid, { data: row });
}
