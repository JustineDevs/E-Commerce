import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load root .env (same file as other apps). Next also loads env from envDir (repo root).
dotenv.config({ path: path.join(__dirname, "../../.env") });

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
  /** Load `.env*` from monorepo root only (no `apps/admin/.env.local`). */
  envDir: path.join(__dirname, "../.."),
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: [],
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
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  transpilePackages: [
    "@apparel-commerce/types",
    "@apparel-commerce/sdk",
    "@apparel-commerce/ui",
    "@apparel-commerce/database",
    "@apparel-commerce/platform-data",
    "@apparel-commerce/omnichannel-policy",
    "@apparel-commerce/validation",
  ],
};

export default nextConfig;
