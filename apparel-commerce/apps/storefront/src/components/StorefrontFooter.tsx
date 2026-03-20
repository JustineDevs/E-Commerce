import Image from "next/image";
import Link from "next/link";
import { getInstagramHref } from "@/lib/public-site";

export function StorefrontFooter() {
  const instagram = getInstagramHref();

  return (
    <footer className="w-full border-t border-slate-100 bg-slate-50 px-[clamp(0.75rem,4vw,2rem)] py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 gap-y-12 md:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1 lg:col-span-2">
          <Link
            href="/"
            className="relative block h-9 w-40 shrink-0 opacity-90 transition-opacity hover:opacity-100 sm:h-10 sm:w-44 md:h-12 md:w-52"
          >
            <Image
              src="/brand/maharlika-logo-horizontal.png"
              alt="Maharlika — Grand Custom"
              width={280}
              height={187}
              className="h-full w-full object-contain object-left"
              sizes="(max-width: 768px) 160px, 208px"
            />
          </Link>
          <p className="font-body text-xs tracking-wide text-slate-500">
            © {new Date().getFullYear()} Maharlika · Grand Custom.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-primary">Shop</h4>
          <nav className="flex flex-col gap-2" aria-label="Shop links">
            <Link href="/shop" className="text-xs text-slate-500 hover:text-primary">
              All products
            </Link>
            <Link href="/collections" className="text-xs text-slate-500 hover:text-primary">
              Collections
            </Link>
            <Link href="/search" className="text-xs text-slate-500 hover:text-primary">
              Search
            </Link>
            <Link href="/wishlist" className="text-xs text-slate-500 hover:text-primary">
              Wishlist
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-primary">Support</h4>
          <nav className="flex flex-col gap-2" aria-label="Support links">
            <Link href="/help" className="text-xs text-slate-500 hover:text-primary">
              Help center
            </Link>
            <Link href="/faq" className="text-xs text-slate-500 hover:text-primary">
              FAQ
            </Link>
            <Link href="/contact" className="text-xs text-slate-500 hover:text-primary">
              Contact
            </Link>
            <Link href="/track" className="text-xs text-slate-500 hover:text-primary">
              Track order
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-primary">Account</h4>
          <nav className="flex flex-col gap-2" aria-label="Account links">
            <Link href="/sign-in" className="text-xs text-slate-500 hover:text-primary">
              Sign in
            </Link>
            <Link href="/register" className="text-xs text-slate-500 hover:text-primary">
              Register
            </Link>
            <Link href="/account" className="text-xs text-slate-500 hover:text-primary">
              My account
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-primary">Policies</h4>
          <nav className="flex flex-col gap-2" aria-label="Legal links">
            <Link href="/shipping" className="text-xs text-slate-500 hover:text-primary">
              Shipping
            </Link>
            <Link href="/returns" className="text-xs text-slate-500 hover:text-primary">
              Returns
            </Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-slate-500 hover:text-primary">
              Privacy
            </Link>
            <Link href="/cookies" className="text-xs text-slate-500 hover:text-primary">
              Cookies
            </Link>
            <Link href="/accessibility" className="text-xs text-slate-500 hover:text-primary">
              Accessibility
            </Link>
            <Link href="/preferences" className="text-xs text-slate-500 hover:text-primary">
              Region &amp; language
            </Link>
            <Link href="/sitemap" className="text-xs text-slate-500 hover:text-primary">
              Site map
            </Link>
          </nav>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-3 lg:col-span-1">
          <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-primary">Connect</h4>
          <nav className="flex flex-col gap-2" aria-label="Social">
            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-primary"
              >
                Instagram
              </a>
            ) : null}
            <Link href="/#join-club" className="text-xs text-slate-500 hover:text-primary">
              Newsletter
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
