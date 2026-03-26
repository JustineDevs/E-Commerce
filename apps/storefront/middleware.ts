import type { NextFetchEvent, NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { tryCmsRedirect } from "@/lib/cms-redirect";

const authMiddleware = withAuth({
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized: ({ token, req }) => {
      const p = req.nextUrl.pathname;
      if (p.startsWith("/account")) return !!token;
      return true;
    },
  },
});

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const redirect = await tryCmsRedirect(request);
  if (redirect) return redirect;
  return authMiddleware(request as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
