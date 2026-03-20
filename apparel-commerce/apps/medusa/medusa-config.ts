import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const lemonSqueezyProvider =
  process.env.LEMONSQUEEZY_API_KEY?.trim() &&
  process.env.LEMONSQUEEZY_STORE_ID?.trim() &&
  process.env.LEMONSQUEEZY_CHECKOUT_VARIANT_ID?.trim() &&
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim()
    ? [
        {
          resolve: "./src/modules/lemonsqueezy-payment",
          id: "lemonsqueezy",
          options: {
            apiKey: process.env.LEMONSQUEEZY_API_KEY!,
            storeId: process.env.LEMONSQUEEZY_STORE_ID!,
            variantId: process.env.LEMONSQUEEZY_CHECKOUT_VARIANT_ID!,
            webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
          },
        },
      ]
    : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    ...(lemonSqueezyProvider.length
      ? [
          {
            resolve: "@medusajs/medusa/payment" as const,
            options: {
              providers: lemonSqueezyProvider,
            },
          },
        ]
      : []),
  ],
})
