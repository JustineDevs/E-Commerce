import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { NextAuthSessionProvider } from "@/components/NextAuthSessionProvider";
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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  verification: {
    google: "8JhcF2FV7sdKYLW9doHSZnPM3yp3K0LlEusSBI-ZT6g",
  },
  title: {
    default: "Maharlika Apparel Custom",
    template: "%s | Maharlika Apparel Custom",
  },
  description:
    "Apparel and custom pieces built for precision. Maharlika Apparel Custom: structural silhouettes, everyday craft.",
  keywords: [
    "Maharlika Apparel Custom",
    "custom apparel Philippines",
    "uniforms",
    "corporate wear",
    "school uniforms",
    "custom jerseys",
    "Filipino apparel",
  ],
  applicationName: "Maharlika Apparel Custom",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/icons/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Maharlika Apparel Custom",
    statusBarStyle: "default",
  },
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
      <body className="min-h-[100dvh] min-w-0 overflow-x-hidden bg-surface text-on-surface font-body antialiased supports-[height:100dvh]:min-h-dvh">
        <NextAuthSessionProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </NextAuthSessionProvider>
        <VercelWebAnalytics />
      </body>
    </html>
  );
}
