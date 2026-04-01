import type { NextRequest } from "next/server";
import NextAuth from "next-auth";

import { buildAuthOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type NextAuthRouteContext = { params: Promise<{ nextauth: string[] }> };

export async function GET(req: NextRequest, context: NextAuthRouteContext) {
  return NextAuth(req, context, buildAuthOptions());
}

export async function POST(req: NextRequest, context: NextAuthRouteContext) {
  return NextAuth(req, context, buildAuthOptions());
}
