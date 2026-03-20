import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const ALLOWED_PREFIXES = new Set(["orders", "inventory", "barcode", "payments", "shipments"]);

function getTargetUrl(pathSegments: string[], request: NextRequest): string | null {
  if (pathSegments.length === 0) {
    return null;
  }
  if (!ALLOWED_PREFIXES.has(pathSegments[0])) {
    return null;
  }
  const base = process.env.API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";
  const path = pathSegments.join("/");
  return `${base}/${path}${request.nextUrl.search}`;
}

async function proxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const target = getTargetUrl(pathSegments, request);
  if (!target) {
    return NextResponse.json({ error: "Forbidden", code: "PROXY_NOT_ALLOWED" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
  }

  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Server misconfigured", code: "MISSING_INTERNAL_API_KEY" }, { status: 503 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
  };
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(target, init);
  const text = await res.text();
  const outHeaders = new Headers();
  const ct = res.headers.get("content-type");
  if (ct) {
    outHeaders.set("Content-Type", ct);
  }
  return new NextResponse(text, { status: res.status, headers: outHeaders });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(request, path ?? []);
}
