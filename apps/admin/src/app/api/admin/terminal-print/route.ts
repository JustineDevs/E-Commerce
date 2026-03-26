import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffHasPermission } from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffHasPermission(session.user.permissions ?? [], "pos:use")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }
  const base =
    process.env.TERMINAL_AGENT_URL?.trim() ||
    process.env.NEXT_PUBLIC_TERMINAL_AGENT_URL?.trim() ||
    "http://127.0.0.1:17711";
  const bodyText = await req.text();
  const secret = process.env.TERMINAL_AGENT_SECRET?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers["X-Terminal-Agent-Secret"] = secret;
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/print-receipt`, {
    method: "POST",
    headers,
    body: bodyText,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = { raw: text };
  }
  return correlatedJson(cid, parsed, { status: res.status });
}
