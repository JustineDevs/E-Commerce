import type { Metadata } from "next";
import Link from "next/link";

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
  const googleHref = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callback)}`;

  return (
    <main className="storefront-page-shell max-w-md">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        Create account
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        Maharlika uses Google sign-in to secure your profile. No separate
        password is stored on our servers.
      </p>
      <a
        href={googleHref}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded bg-primary py-4 text-sm font-bold uppercase tracking-widest text-on-primary hover:opacity-90"
      >
        Register with Google
      </a>
      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
