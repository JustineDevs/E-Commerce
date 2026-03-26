import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@apparel-commerce/ui";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callback =
    typeof sp.callbackUrl === "string" && sp.callbackUrl.startsWith("/")
      ? sp.callbackUrl
      : "/account";
  return (
    <main className="storefront-page-shell max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            Create account
          </CardTitle>
          <CardDescription className="font-body text-sm leading-relaxed">
            Maharlika uses Google sign-in to secure your profile. No separate
            password is stored on our servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <GoogleSignInButton
            callbackUrl={callback}
            label="Register with Google"
            className="mt-0 w-full uppercase tracking-widest"
          />
          <p className="text-center text-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
