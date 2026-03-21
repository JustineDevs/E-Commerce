import { GlobalRouteMotion } from "../../components/GlobalRouteMotion";
import { StorefrontFooter } from "../../components/StorefrontFooter";
import { StorefrontHeader } from "../../components/StorefrontHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StorefrontHeader />
      <div className="mx-auto w-full min-w-0 max-w-[100vw] pt-[5.875rem] xs:pt-24 sm:pt-[6.125rem] md:pt-[6.25rem]">
        <GlobalRouteMotion>{children}</GlobalRouteMotion>
      </div>
      <StorefrontFooter />
    </>
  );
}
