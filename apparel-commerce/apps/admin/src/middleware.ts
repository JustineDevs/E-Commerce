import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      const r = token?.role as string | undefined;
      return r === "admin" || r === "staff";
    },
  },
});

export const config = {
  matcher: ["/admin/:path*"],
};
