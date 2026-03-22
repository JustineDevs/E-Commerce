import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/api/auth/signin" },
  callbacks: {
    authorized: ({ token }) => {
      const r = token?.role as string | undefined;
      return r === "admin" || r === "staff";
    },
  },
});

export const config = {
  matcher: ["/admin/:path*", "/api/pos/:path*", "/api/medusa/:path*"],
};
