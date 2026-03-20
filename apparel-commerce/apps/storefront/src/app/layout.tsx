import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apparel Commerce",
  description: "Shop the latest apparel and accessories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
