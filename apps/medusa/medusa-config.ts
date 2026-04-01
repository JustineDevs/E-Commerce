import { resolve } from "node:path";
import { loadEnv, defineConfig } from "@medusajs/framework/utils";
import { validateMedusaProcessEnv } from "./src/loaders/validate-process-env";

const env = process.env.NODE_ENV || "development";
loadEnv(env, resolve(process.cwd(), "../.."));
loadEnv(env, process.cwd());
validateMedusaProcessEnv();

const stripeProvider = process.env.STRIPE_API_KEY?.trim()
  ? [
      {
        resolve: "@medusajs/payment-stripe",
        id: "stripe",
        options: {
          apiKey: process.env.STRIPE_API_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        },
      },
    ]
  : [];

const codProvider = [
  {
    resolve: "./src/modules/cod-payment",
    id: "cod",
    options: {},
  },
];

const paypalProvider =
  process.env.PAYPAL_CLIENT_ID?.trim() &&
  process.env.PAYPAL_CLIENT_SECRET?.trim()
    ? [
        {
          resolve: "./src/modules/paypal-payment",
          id: "paypal",
          options: {
            clientId: process.env.PAYPAL_CLIENT_ID!,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
            sandbox:
              process.env.PAYPAL_ENVIRONMENT === "sandbox" ||
              process.env.NODE_ENV !== "production",
          },
        },
      ]
    : [];

const paymongoProvider =
  process.env.PAYMONGO_SECRET_KEY?.trim() &&
  process.env.PAYMONGO_WEBHOOK_SECRET?.trim()
    ? [
        {
          resolve: "./src/modules/paymongo-payment",
          id: "paymongo",
          options: {
            secretKey: process.env.PAYMONGO_SECRET_KEY!,
            webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET!,
          },
        },
      ]
    : [];

const mayaProvider =
  process.env.MAYA_SECRET_KEY?.trim() && process.env.MAYA_WEBHOOK_SECRET?.trim()
    ? [
        {
          resolve: "./src/modules/maya-payment",
          id: "maya",
          options: {
            secretKey: process.env.MAYA_SECRET_KEY!,
            webhookSecret: process.env.MAYA_WEBHOOK_SECRET!,
            sandbox: process.env.MAYA_SANDBOX === "true",
          },
        },
      ]
    : [];

const paymentProviders = [
  ...stripeProvider,
  ...codProvider,
  ...paypalProvider,
  ...paymongoProvider,
  ...mayaProvider,
];

if (stripeProvider.length === 0) {
  console.warn(
    "[medusa-config] Stripe provider is not registered (STRIPE_API_KEY missing). " +
      "Regions that list pp_stripe_stripe will fail when creating payment sessions. " +
      "Set STRIPE_API_KEY (and STRIPE_WEBHOOK_SECRET in production) in the Medusa environment, " +
      "or remove Stripe from the region in Medusa Admin → Settings → Regions.",
  );
}

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: false,
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  modules: [
    ...(paymentProviders.length
      ? [
          {
            resolve: "@medusajs/medusa/payment" as const,
            options: {
              providers: paymentProviders,
            },
          },
        ]
      : []),
  ],
});
