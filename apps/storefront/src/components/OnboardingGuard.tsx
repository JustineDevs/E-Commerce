"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ALLOW_WHEN_INCOMPLETE = new Set([
  "/",
  "/sign-in",
  "/register",
  "/onboarding",
  "/privacy",
  "/terms",
  "/cookies",
  "/shipping",
  "/returns",
]);

function pathAllowed(pathname: string): boolean {
  if (ALLOW_WHEN_INCOMPLETE.has(pathname)) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.includes(".")) return true;
  return false;
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(false);
  const redirecting = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated" || !session?.user?.email) {
      setChecked(true);
      return;
    }
    if (!pathname || pathAllowed(pathname)) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    void fetch("/api/account/profile/status")
      .then(async (r) => {
        const j = (await r.json()) as { complete?: boolean };
        if (cancelled) return;
        if (j.complete === true) {
          setChecked(true);
          return;
        }
        if (redirecting.current) return;
        redirecting.current = true;
        const next = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
        router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status, session, pathname, router, searchParams]);

  if (status === "authenticated" && !checked && pathname && !pathAllowed(pathname)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-body text-sm text-on-surface-variant">
        Loading your profile…
      </div>
    );
  }

  return <>{children}</>;
}
