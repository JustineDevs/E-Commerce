import { StorefrontNav } from "../../components/StorefrontNav";
import { StorefrontFooter } from "../../components/StorefrontFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StorefrontNav />
      <main className="pt-20">{children}</main>
      <StorefrontFooter />
    </>
  );
}
