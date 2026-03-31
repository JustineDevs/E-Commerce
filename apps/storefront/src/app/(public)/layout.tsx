import { StorefrontPublicChrome } from "../../components/StorefrontPublicChrome";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontPublicChrome>{children}</StorefrontPublicChrome>;
}
