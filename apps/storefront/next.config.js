/** @type {import('next').NextConfig} */
const path = require("path");
const { loadMonorepoRootEnv } = require("../../stress-test/scripts/load-monorepo-root-env.cjs");
// Repo-root `.env` + `.env.local` (e.g. MEDUSA_SECRET_API_KEY for checkout totals preview)
loadMonorepoRootEnv(__dirname);

function imageRemotePatterns() {
  const raw = process.env.NEXT_PUBLIC_IMAGE_HOSTNAMES ?? "*.supabase.co,**.supabase.co";
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
      hostname: "cdn.simpleicons.org",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "lh3.googleusercontent.com",
      pathname: "/**",
    },
    { protocol: "https", hostname: "**.fbcdn.net", pathname: "/**" },
  ];
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@apparel-commerce/types",
    "@apparel-commerce/sdk",
    "@apparel-commerce/ui",
    "@apparel-commerce/validation",
    "@apparel-commerce/platform-data",
    "@apparel-commerce/omnichannel-policy",
  ],
  experimental: {
    optimizePackageImports: [
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
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  /** Older clients or typos called `/api/medusa-totals-preview`; canonical route is under `/api/checkout/`. */
  async rewrites() {
    return [
      {
        source: "/api/medusa-totals-preview",
        destination: "/api/checkout/medusa-totals-preview",
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

module.exports = nextConfig;
