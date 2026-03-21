const path = require("path");
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ['@apparel-commerce/types', '@apparel-commerce/sdk'],
};

module.exports = nextConfig;
