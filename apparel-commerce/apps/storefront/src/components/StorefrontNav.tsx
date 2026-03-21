import Image from "next/image";
import Link from "next/link";
import { IconBag, IconHeart, IconPerson } from "./NavActionIcons";
import { StorefrontMainNav } from "./StorefrontMainNav";

export function StorefrontNav() {
  return (
    <nav className="relative flex w-full min-w-0 max-w-full items-center justify-between gap-2 px-[clamp(0.75rem,3vw,2rem)] py-1.5 font-headline tracking-tight shadow-[0px_8px_24px_rgba(0,0,0,0.06)] sm:gap-3 sm:py-2">
      <Link
        href="/"
        className="relative flex aspect-square h-10 w-10 shrink-0 items-center justify-center transition-opacity duration-200 hover:opacity-85 xs:h-11 xs:w-11 sm:h-12 sm:w-12 md:h-12 md:w-12"
        data-testid="nav-home"
        aria-label="Maharlika Apparel Custom, home"
      >
        <Image
          src="/brand/maharlika-logo-abstract.png"
          alt="Maharlika Apparel Custom"
          width={512}
          height={512}
          className="h-full w-full object-contain object-center"
          sizes="(max-width: 640px) 44px, (max-width: 1024px) 52px, 56px"
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
          <IconHeart />
        </Link>
        <Link
          href="/checkout"
          data-testid="nav-checkout"
          className="text-primary transition-transform duration-200 hover:scale-95"
          aria-label="Shopping bag"
        >
          <IconBag />
        </Link>
        <Link
          href="/account"
          data-testid="nav-account"
          className="text-primary transition-transform duration-200 hover:scale-95"
          aria-label="Account"
        >
          <IconPerson />
        </Link>
      </div>
    </nav>
  );
}
