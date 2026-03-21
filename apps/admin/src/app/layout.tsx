import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { NextAuthSessionProvider } from "@/components/NextAuthSessionProvider";
import { LenisProvider } from "@/components/LenisProvider";
import { VercelWebAnalytics } from "@/components/VercelWebAnalytics";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maharlika Apparel Custom | Admin",
  description: "Staff console for orders, inventory, and POS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${inter.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface antialiased">
        <NextAuthSessionProvider>
          <LenisProvider>{children}</LenisProvider>
        </NextAuthSessionProvider>
        <VercelWebAnalytics />
      </body>
    </html>
  );
}
