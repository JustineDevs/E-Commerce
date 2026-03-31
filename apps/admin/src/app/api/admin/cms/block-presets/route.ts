import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import type { CmsBlock } from "@apparel-commerce/platform-data";
import {
  insertCmsPageBlockPreset,
  listCmsPageBlockPresets,
} from "@apparel-commerce/platform-data";
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
  if (!staffSessionAllows(session, "content:read")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const data = await listCmsPageBlockPresets(sup.client);
  return correlatedJson(cid, { data });
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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return correlatedJson(cid, { error: "Invalid JSON" }, { status: 400 });
  }
  const o = body as { name?: string; blocks?: unknown };
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) {
    return correlatedJson(cid, { error: "name required" }, { status: 400 });
  }
  const blocks = (Array.isArray(o.blocks) ? o.blocks : []) as CmsBlock[];
  const sup = adminSupabaseOr503(cid);
  if ("response" in sup) return sup.response;
  const row = await insertCmsPageBlockPreset(sup.client, {
    name,
    blocks,
  });
  if (!row) {
    return correlatedJson(cid, { error: "Unable to save preset" }, { status: 500 });
  }
  return correlatedJson(cid, { data: row });
}
