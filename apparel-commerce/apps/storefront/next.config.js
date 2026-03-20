/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@apparel-commerce/ui', '@apparel-commerce/types', '@apparel-commerce/validation', '@apparel-commerce/sdk'],
};

module.exports = nextConfig;
