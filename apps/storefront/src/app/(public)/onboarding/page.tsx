import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <main className="storefront-page-shell mx-auto max-w-lg py-10">
      <Suspense fallback={<p className="text-sm text-on-surface-variant">Loading…</p>}>
        <OnboardingClient />
      </Suspense>
    </main>
  );
}
