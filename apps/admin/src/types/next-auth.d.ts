/* eslint-disable no-unused-vars */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
      permissions?: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string | null;
    role?: string;
    permissions?: string[];
    name?: string | null;
    picture?: string | null;
  }
}
