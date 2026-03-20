import Link from "next/link";

export function StorefrontNav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.04)] flex justify-between items-center px-8 py-4 max-w-full font-headline tracking-tight">
      <Link href="/" className="text-2xl font-bold tracking-tighter text-primary">
        ARCHITECT
      </Link>
      <div className="hidden md:flex items-center gap-12">
        <Link
          href="/shop"
          className="text-primary font-semibold border-b-2 border-primary pb-1 transition-colors"
        >
          Shop
        </Link>
        <Link
          href="/shop"
          className="text-on-surface-variant font-medium hover:text-primary transition-colors"
        >
          Collections
        </Link>
        <Link
          href="/"
          className="text-on-surface-variant font-medium hover:text-primary transition-colors"
        >
          About
        </Link>
      </div>
      <div className="flex items-center gap-6">
        <Link href="/checkout" className="text-primary hover:scale-95 duration-200 transition-transform">
          <span className="material-symbols-outlined">shopping_bag</span>
        </Link>
        <Link href="/account" className="text-primary hover:scale-95 duration-200 transition-transform">
          <span className="material-symbols-outlined">person</span>
        </Link>
      </div>
    </nav>
  );
}
