import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/** Avoid any static caching of OAuth state / callback handling. */
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
