import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const callback = typeof sp.callbackUrl === "string" && sp.callbackUrl.startsWith("/") ? sp.callbackUrl : "/account";
  const googleHref = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callback)}`;

  return (
    <main className="mx-auto max-w-md px-[clamp(0.75rem,4vw,2rem)] pb-24 pt-24 sm:pt-32">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">Sign in</h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        Access your account and order history with Google. By continuing you agree to our{" "}
        <Link href="/terms" className="underline hover:text-primary">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-primary">
          Privacy
        </Link>
        .
      </p>
      {sp.error ? (
        <p className="mt-4 rounded border border-error/30 bg-error-container/30 px-4 py-2 text-sm text-error" role="alert">
          Sign-in error. Check Google OAuth configuration or try again.
        </p>
      ) : null}
      <a
        href={googleHref}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded bg-primary py-4 text-sm font-bold uppercase tracking-widest text-on-primary hover:opacity-90"
      >
        Continue with Google
      </a>
      <p className="mt-6 text-center text-sm text-on-surface-variant">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
