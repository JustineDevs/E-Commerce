const path = require("path");
// Load root .env so NEXTAUTH_* and GOOGLE_* are available
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ['@apparel-commerce/types', '@apparel-commerce/sdk'],
};

module.exports = nextConfig;
