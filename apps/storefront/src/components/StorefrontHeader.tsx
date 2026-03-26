import type { CmsNavLink } from "@apparel-commerce/platform-data";
import { StorefrontNav } from "./StorefrontNav";
import { StorefrontUtilityBar } from "./StorefrontUtilityBar";

export function StorefrontHeader({
  announcement,
  mainNavItems,
}: {
  announcement?: React.ReactNode;
  mainNavItems?: CmsNavLink[];
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex w-full min-w-0 flex-col bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
      {announcement}
      <StorefrontUtilityBar />
      <StorefrontNav mainNavItems={mainNavItems} />
    </header>
  );
}
