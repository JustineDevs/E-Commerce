import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createSupabaseClient, upsertOAuthUser, isStaffRole } from "@apparel-commerce/database";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email || account?.provider !== "google" || !account.providerAccountId) {
        return false;
      }
      const promote =
        process.env.ADMIN_ALLOWED_EMAILS?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      const supabase = createSupabaseClient();
      const { role } = await upsertOAuthUser(
        supabase,
        {
          email: user.email,
          name: user.name,
          image: user.image,
          googleSub: account.providerAccountId,
        },
        { promoteEmails: promote }
      );
      user.role = role;
      if (!isStaffRole(role)) {
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
};
