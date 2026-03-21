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
  transpilePackages: ["@apparel-commerce/ui", "@apparel-commerce/types", "@apparel-commerce/sdk"],
  images: {
    remotePatterns: imageRemotePatterns(),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(__dirname, "src"),
    };
    return config;
  },
};

module.exports = nextConfig;
