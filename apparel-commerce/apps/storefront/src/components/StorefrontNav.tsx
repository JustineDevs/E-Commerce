import Image from "next/image";
import Link from "next/link";
import { StorefrontMainNav } from "./StorefrontMainNav";

export function StorefrontNav() {
  return (
    <nav className="relative flex w-full min-w-0 max-w-full items-center justify-between gap-2 px-[clamp(0.75rem,3vw,2rem)] py-3 font-headline tracking-tight shadow-[0px_8px_24px_rgba(0,0,0,0.06)] sm:gap-3 sm:py-4">
      <Link
        href="/"
        className="relative flex h-8 w-[min(180px,38vw)] shrink-0 items-center transition-opacity duration-200 hover:opacity-85 xs:h-9 md:h-11 md:w-[min(200px,42vw)]"
        data-testid="nav-home"
        aria-label="Maharlika — Grand Custom, home"
      >
        <Image
          src="/brand/maharlika-logo-horizontal.png"
          alt="Maharlika — Grand Custom"
          width={320}
          height={214}
          className="h-full w-full object-contain object-left"
          sizes="(max-width: 768px) 42vw, 200px"
          priority
        />
      </Link>
      <StorefrontMainNav />
      <div className="flex shrink-0 items-center gap-3 sm:gap-5 md:gap-6">
        <Link
          href="/wishlist"
          className="text-primary transition-transform duration-200 hover:scale-95"
          aria-label="Wishlist"
        >
          <span className="material-symbols-outlined text-[22px] sm:text-[24px]">favorite</span>
        </Link>
        <Link
          href="/checkout"
          data-testid="nav-checkout"
          className="text-primary transition-transform duration-200 hover:scale-95"
          aria-label="Shopping bag"
        >
          <span className="material-symbols-outlined text-[22px] sm:text-[24px]">shopping_bag</span>
        </Link>
        <Link
          href="/account"
          data-testid="nav-account"
          className="text-primary transition-transform duration-200 hover:scale-95"
          aria-label="Account"
        >
          <span className="material-symbols-outlined text-[22px] sm:text-[24px]">person</span>
        </Link>
      </div>
    </nav>
  );
}
