import type { Metadata } from "next";
import Link from "next/link";
import { ContactSupportForm } from "@/components/ContactSupportForm";
import { getCachedPublicSiteMetadata } from "@/lib/public-site-metadata";

export const metadata: Metadata = {
  title: "Contact us",
};

export default async function ContactPage() {
  const meta = await getCachedPublicSiteMetadata();

  return (
    <main className="storefront-page-shell max-w-2xl">
      <h1 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
        Contact us
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-on-surface-variant">
        Orders, exchanges, and product questions for{" "}
        <strong>Maharlika Apparel Custom</strong>. We handle messages in the
        order they arrive, during business hours (Philippines).
      </p>
      <div className="mt-10">
        <ContactSupportForm
          supportEmail={meta.supportEmail}
          supportPhone={meta.supportPhone}
        />
      </div>
      <p className="mt-12 text-sm text-on-surface-variant">
        Prefer self-service? See the{" "}
        <Link href="/help" className="text-primary underline">
          Help center
        </Link>{" "}
        or{" "}
        <Link href="/faq" className="text-primary underline">
          FAQ
        </Link>
        .
      </p>
    </main>
  );
}
