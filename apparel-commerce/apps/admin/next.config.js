const path = require("path");
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ['@apparel-commerce/ui', '@apparel-commerce/types', '@apparel-commerce/sdk'],
};

module.exports = nextConfig;
