/** @type {import('next').NextConfig} */
function imageRemotePatterns() {
  const raw = process.env.NEXT_PUBLIC_IMAGE_HOSTNAMES ?? "*.supabase.co,**.supabase.co";
  return raw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/**",
    }));
}

const path = require("path");
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@apparel-commerce/types",
    "@apparel-commerce/sdk",
    "@apparel-commerce/validation",
  ],
  images: {
    remotePatterns: imageRemotePatterns(),
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
