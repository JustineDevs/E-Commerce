import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {
  tryCreateSupabaseClient,
  upsertOAuthUser,
  isStaffRole,
  resolveStaffPermissionsForUserId,
} from "@apparel-commerce/database";

const PERMISSIONS_CACHE_TTL_MS = 60_000;
const staffSnapshotCache = new Map<
  string,
  { permissions: string[]; role: string | undefined; expiresAt: number }
>();

function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Loads RBAC from Supabase (source of truth). Uses lowercase email for cache and lookup
 * so `ADMIN_ALLOWED_EMAILS` and Google casing match stored `users.email`.
 */
async function getCachedStaffSnapshot(email: string): Promise<{
  permissions: string[];
  role: string | undefined;
}> {
  const key = normalizeEmailKey(email);
  const cached = staffSnapshotCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return { permissions: cached.permissions, role: cached.role };
  }
  const supabase = tryCreateSupabaseClient();
  if (!supabase) return { permissions: [], role: undefined };

  const { data: row } = await supabase
    .from("users")
    .select("id")
    .eq("email", key)
    .maybeSingle();

  if (!row?.id) return { permissions: [], role: undefined };

  const userId = row.id as string;
  const [permissions, roleRes] = await Promise.all([
    resolveStaffPermissionsForUserId(supabase, userId),
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
  ]);
  const role = (roleRes.data?.role as string | undefined) ?? "customer";

  staffSnapshotCache.set(key, {
    permissions,
    role,
    expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS,
  });
  return { permissions, role };
}

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";

if (process.env.NODE_ENV === "development" && (!googleClientId || !googleClientSecret)) {
  console.warn(
    "[admin auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is empty. Google sign-in will not work. Check root .env.",
  );
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET?.trim(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email || account?.provider !== "google" || !account.providerAccountId) {
        return false;
      }
      const emailNorm = normalizeEmailKey(user.email);
      user.email = emailNorm;
      const promote =
        process.env.ADMIN_ALLOWED_EMAILS?.split(",")
          .map((s) => normalizeEmailKey(s))
          .filter(Boolean) ?? [];
      try {
        const supabase = tryCreateSupabaseClient();
        if (!supabase) {
          console.error("[admin auth] Supabase is not configured (missing SUPABASE_URL or keys)");
          return false;
        }
        const { role } = await upsertOAuthUser(
          supabase,
          {
            email: emailNorm,
            name: user.name,
            image: user.image,
            googleSub: account.providerAccountId,
          },
          { promoteEmails: promote },
        );
        user.role = role;
        if (!isStaffRole(role)) {
          return false;
        }
        staffSnapshotCache.delete(emailNorm);
        return true;
      } catch (err) {
        console.error("[admin auth] upsertOAuthUser failed:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        session.user.email = normalizeEmailKey(session.user.email);
      }
      if (session.user) {
        try {
          if (session.user.email) {
            const snapshot = await getCachedStaffSnapshot(session.user.email);
            session.user.permissions = snapshot.permissions;
            session.user.role = snapshot.role ?? (token.role as string | undefined);
          } else {
            session.user.role = token.role as string | undefined;
          }
        } catch (err) {
          console.error("[admin auth] session RBAC refresh failed:", err);
          session.user.role = token.role as string | undefined;
        }
      }
      return session;
    },
  },
};
