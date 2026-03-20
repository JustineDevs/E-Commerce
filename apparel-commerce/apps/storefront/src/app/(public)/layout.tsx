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
      <div className="mx-auto w-full min-w-0 max-w-[100vw] pt-[5.75rem] xs:pt-[6rem] sm:pt-[6.5rem] md:pt-[7rem]">
        {children}
      </div>
      <StorefrontFooter />
    </>
  );
}