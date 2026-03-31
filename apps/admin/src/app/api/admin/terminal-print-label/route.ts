import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { staffSessionAllows } from "@apparel-commerce/database";
import { authOptions } from "@/lib/auth";
import { terminalPrintLabelBodySchema } from "@/lib/terminal-print-schemas";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export async function POST(req: NextRequest) {
  const cid = getCorrelationId(req);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return correlatedJson(cid, { error: "Unauthorized" }, { status: 401 });
  }
  if (!staffSessionAllows(session, "pos:use")) {
    return correlatedJson(cid, { error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = terminalPrintLabelBodySchema.safeParse(raw);
  if (!parsed.success) {
    return correlatedJson(
      cid,
      {
        error: "Invalid print label payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const base =
    process.env.TERMINAL_AGENT_URL?.trim() ||
    process.env.NEXT_PUBLIC_TERMINAL_AGENT_URL?.trim() ||
    "http://127.0.0.1:17711";
  const secret = process.env.TERMINAL_AGENT_SECRET?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers["X-Terminal-Agent-Secret"] = secret;
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/print-label`, {
    method: "POST",
    headers,
    body: JSON.stringify(parsed.data),
  });
  const text = await res.text();
  let parsedOut: unknown = text;
  try {
    parsedOut = JSON.parse(text) as unknown;
  } catch {
    parsedOut = { raw: text };
  }
  return correlatedJson(cid, parsedOut, { status: res.status });
}
