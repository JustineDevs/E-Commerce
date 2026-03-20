import Link from "next/link";

export function StorefrontFooter() {
  return (
    <footer className="w-full py-20 px-12 border-t border-slate-100 bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">
          <div className="text-xl font-bold text-primary">ARCHITECT</div>
          <p className="font-body text-xs tracking-wide text-slate-500">
            © 2024 Architectural Silence. All rights reserved.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="font-headline text-sm font-bold text-primary uppercase tracking-widest">
            Navigation
          </h4>
          <div className="flex flex-col gap-2">
            <Link
              href="/shop"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              Shop
            </Link>
            <Link
              href="/shop"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              Collections
            </Link>
            <Link
              href="/"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              About
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="font-headline text-sm font-bold text-primary uppercase tracking-widest">
            Connect
          </h4>
          <div className="flex flex-col gap-2">
            <Link
              href="#"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              Instagram
            </Link>
            <Link
              href="#"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              Newsletter
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="font-headline text-sm font-bold text-primary uppercase tracking-widest">
            Policy
          </h4>
          <div className="flex flex-col gap-2">
            <Link
              href="#"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              Shipping
            </Link>
            <Link
              href="#"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              Returns
            </Link>
            <Link
              href="#"
              className="text-slate-400 font-body text-xs tracking-wide hover:text-primary transition-opacity"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
