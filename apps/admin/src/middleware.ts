import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

const authMiddleware = withAuth({
  pages: { signIn: "/api/auth/signin" },
  callbacks: {
    authorized: ({ token }) => {
      const r = token?.role as string | undefined;
      return r === "admin" || r === "staff";
    },
  },
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const p = req.nextUrl.pathname;
  if (p === "/api/integrations/channels/webhook") {
    return NextResponse.next();
  }
  if (p === "/api/integrations/chat-orders/intake") {
    const key = req.headers.get("x-internal-key");
    const expected = process.env.INTERNAL_CHAT_INTAKE_KEY?.trim();
    if (expected && key === expected) {
      return NextResponse.next();
    }
  }
  return (
    authMiddleware as unknown as (
      _req: NextRequest,
      _event: NextFetchEvent,
    ) => Response | Promise<Response>
  )(req, event);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/integrations/:path*",
  ],
};
