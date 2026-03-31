import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {
  loadGoogleCredentials,
  buildSharedJwtCallback,
  buildSharedSessionCallback,
} from "@apparel-commerce/sdk";

const google = loadGoogleCredentials("storefront");

const sharedJwt = buildSharedJwtCallback();
const sharedSession = buildSharedSessionCallback();

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: google.clientId,
      clientSecret: google.clientSecret,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET?.trim(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/sign-in" },
  callbacks: {
    jwt: sharedJwt as NextAuthOptions["callbacks"] extends { jwt?: infer J } ? J : never,
    session: sharedSession as NextAuthOptions["callbacks"] extends { session?: infer S } ? S : never,
  },
};
