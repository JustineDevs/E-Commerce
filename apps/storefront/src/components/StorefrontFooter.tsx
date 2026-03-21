import Image from "next/image";
import Link from "next/link";
import { getInstagramHref } from "@/lib/public-site";

export function StorefrontFooter() {
  const instagram = getInstagramHref();

  return (
    <footer className="w-full border-t border-slate-100 bg-slate-50 px-[clamp(0.75rem,4vw,2rem)] py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-12 gap-y-14 md:grid-cols-3 md:gap-x-14 lg:grid-cols-6">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1 lg:col-span-2">
          <Link
            href="/"
            className="relative block h-[5.75rem] w-full max-w-2xl shrink-0 overflow-visible opacity-90 transition-opacity hover:opacity-100 sm:h-[7rem] md:h-[8.5rem] lg:h-[9.5rem]"
          >
            <Image
              src="/brand/maharlika-logo-horizontal.png"
              alt="Maharlika Apparel Custom"
              width={960}
              height={640}
              className="h-full w-full max-w-2xl origin-left scale-[1.15] object-contain object-left md:scale-[1.1]"
              sizes="(max-width: 768px) 92vw, (max-width: 1280px) 672px, 960px"
            />
          </Link>
          <p className="font-body text-sm tracking-wide text-slate-500">
            © {new Date().getFullYear()} Maharlika Apparel Custom.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <h4 className="font-headline text-sm font-bold uppercase tracking-widest text-primary md:text-base">
            Shop
          </h4>
          <nav
            className="flex flex-col gap-2.5 md:gap-3"
            aria-label="Shop links"
          >
            <Link
              href="/shop"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              All products
            </Link>
            <Link
              href="/collections"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Collections
            </Link>
            <Link
              href="/search"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Search
            </Link>
            <Link
              href="/wishlist"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Wishlist
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <h4 className="font-headline text-sm font-bold uppercase tracking-widest text-primary md:text-base">
            Support
          </h4>
          <nav
            className="flex flex-col gap-2.5 md:gap-3"
            aria-label="Support links"
          >
            <Link
              href="/help"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Help center
            </Link>
            <Link
              href="/faq"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Contact
            </Link>
            <Link
              href="/track"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Track order
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <h4 className="font-headline text-sm font-bold uppercase tracking-widest text-primary md:text-base">
            Account
          </h4>
          <nav
            className="flex flex-col gap-2.5 md:gap-3"
            aria-label="Account links"
          >
            <Link
              href="/sign-in"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Register
            </Link>
            <Link
              href="/account"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              My account
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <h4 className="font-headline text-sm font-bold uppercase tracking-widest text-primary md:text-base">
            Policies
          </h4>
          <nav
            className="flex flex-col gap-2.5 md:gap-3"
            aria-label="Legal links"
          >
            <Link
              href="/shipping"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Shipping
            </Link>
            <Link
              href="/returns"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Returns
            </Link>
            <Link
              href="/terms"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Privacy
            </Link>
            <Link
              href="/cookies"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Cookies
            </Link>
            <Link
              href="/accessibility"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Accessibility
            </Link>
            <Link
              href="/preferences"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Region &amp; language
            </Link>
            <Link
              href="/sitemap"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Site map
            </Link>
          </nav>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-4 lg:col-span-1">
          <h4 className="font-headline text-sm font-bold uppercase tracking-widest text-primary md:text-base">
            Connect
          </h4>
          <nav className="flex flex-col gap-2.5 md:gap-3" aria-label="Social">
            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
              >
                Instagram
              </a>
            ) : null}
            <Link
              href="/#join-club"
              className="text-sm leading-snug text-slate-600 hover:text-primary md:text-base"
            >
              Newsletter
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
