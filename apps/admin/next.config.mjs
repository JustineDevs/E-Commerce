import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load root .env for shared secrets (GOOGLE_*, NEXTAUTH_SECRET, etc.)
dotenv.config({ path: path.join(__dirname, "../../.env") });
// Admin-local overrides (NEXTAUTH_URL=http://localhost:3001) take precedence
dotenv.config({ path: path.join(__dirname, ".env.local"), override: true });

function imageRemotePatterns() {
  const raw =
    process.env.NEXT_PUBLIC_IMAGE_HOSTNAMES ?? "*.supabase.co,**.supabase.co";
  const fromEnv = raw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/**",
    }));
  return [
    ...fromEnv,
    {
      protocol: "https",
      hostname: "lh3.googleusercontent.com",
      pathname: "/**",
    },
    /** Meta / Facebook image CDNs (e.g. product thumbnails pasted from FB URLs). */
    { protocol: "https", hostname: "**.fbcdn.net", pathname: "/**" },
    { protocol: "http", hostname: "localhost", pathname: "/**" },
    { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["@aws-sdk/client-kms"],
  experimental: {
    externalDir: true,
    optimizePackageImports: [
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-label",
      "@radix-ui/react-separator",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageRemotePatterns(),
  },
  transpilePackages: [
    "@apparel-commerce/types",
    "@apparel-commerce/sdk",
    "@apparel-commerce/ui",
    "@apparel-commerce/database",
    "@apparel-commerce/platform-data",
    "@apparel-commerce/payment-connection-crypto",
  ],
};

export default nextConfig;
