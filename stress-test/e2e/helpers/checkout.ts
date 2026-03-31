import { type Page, type APIRequestContext, test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const medusaBaseURL = process.env.PLAYWRIGHT_MEDUSA_URL ?? "http://localhost:9000";

export type PaymentProvider = "stripe" | "paypal" | "paymongo" | "maya" | "cod";

export type PspCredentials = {
  stripe?: { testCardNumber: string; expiry: string; cvc: string };
  paypal?: { email: string; password: string };
  paymongo?: { testCardNumber: string; expiry: string; cvc: string };
  maya?: { testCardNumber: string; expiry: string; cvc: string };
};

/**
 * Environment-based PSP configuration. Each test reads these env vars
 * to decide whether to run or skip the PSP-specific checkout.
 */
export function getPspTestConfig(): {
  provider: PaymentProvider;
  configured: boolean;
  envVars: Record<string, string | undefined>;
}[] {
  return [
    {
      provider: "stripe",
      configured: Boolean(process.env.E2E_STRIPE_API_KEY?.trim()),
      envVars: {
        apiKey: process.env.E2E_STRIPE_API_KEY,
        webhookSecret: process.env.E2E_STRIPE_WEBHOOK_SECRET,
      },
    },
    {
      provider: "paypal",
      configured: Boolean(
        process.env.E2E_PAYPAL_CLIENT_ID?.trim() &&
          process.env.E2E_PAYPAL_CLIENT_SECRET?.trim(),
      ),
      envVars: {
        clientId: process.env.E2E_PAYPAL_CLIENT_ID,
        clientSecret: process.env.E2E_PAYPAL_CLIENT_SECRET,
      },
    },
    {
      provider: "paymongo",
      configured: Boolean(process.env.E2E_PAYMONGO_SECRET_KEY?.trim()),
      envVars: {
        secretKey: process.env.E2E_PAYMONGO_SECRET_KEY,
        webhookSecret: process.env.E2E_PAYMONGO_WEBHOOK_SECRET,
      },
    },
    {
      provider: "maya",
      configured: Boolean(process.env.E2E_MAYA_SECRET_KEY?.trim()),
      envVars: {
        secretKey: process.env.E2E_MAYA_SECRET_KEY,
      },
    },
    {
      provider: "cod",
      configured: true,
      envVars: {},
    },
  ];
}

export function skipUnlessPspConfigured(provider: PaymentProvider): void {
  const config = getPspTestConfig().find((c) => c.provider === provider);
  if (!config?.configured) {
    test.skip(
      true,
      `${provider} E2E credentials not configured (set E2E_${provider.toUpperCase()}_* env vars)`,
    );
  }
}

/**
 * Verifies Medusa has the payment provider registered via the admin health endpoint.
 */
export async function skipUnlessPspRegisteredInMedusa(
  request: APIRequestContext,
  provider: PaymentProvider,
): Promise<void> {
  try {
    const res = await request.get(`${medusaBaseURL}/admin/payment-health`, {
      failOnStatusCode: false,
    });
    if (!res.ok()) {
      test.skip(true, `Medusa payment-health endpoint not available (${res.status()})`);
      return;
    }
    const body = (await res.json()) as {
      providers?: Record<string, { configured: boolean }>;
    };
    if (!body.providers?.[provider]?.configured) {
      test.skip(true, `${provider} not configured in Medusa`);
    }
  } catch {
    test.skip(true, "Medusa not reachable for payment-health check");
  }
}

export async function navigateToShopAndAddFirstProduct(page: Page): Promise<void> {
  await page.goto(`${baseURL}/shop`);
  await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 30_000 });

  const productLink = page.locator('a[href^="/shop/"]').first();
  await expect(productLink).toBeVisible({ timeout: 15_000 });
  await productLink.click();

  await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 30_000 });

  const addToCartBtn = page.getByRole("button", { name: /add to (cart|bag)/i });
  if (await addToCartBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await addToCartBtn.click();
    await page.waitForTimeout(1_000);
  }
}

export async function navigateToCheckout(page: Page): Promise<void> {
  await page.goto(`${baseURL}/checkout`);
  await expect(
    page.getByRole("heading", { name: /checkout/i }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function fillCheckoutShippingInfo(
  page: Page,
  info?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
  },
): Promise<void> {
  const defaults = {
    email: "e2e-test@example.com",
    firstName: "E2E",
    lastName: "Tester",
    address: "123 Test Street",
    city: "Manila",
    postalCode: "1000",
    phone: "+639171234567",
    ...info,
  };

  const emailInput = page.getByLabel(/email/i).first();
  if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await emailInput.fill(defaults.email);
  }

  const firstNameInput = page.getByLabel(/first name/i).first();
  if (await firstNameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await firstNameInput.fill(defaults.firstName);
  }

  const lastNameInput = page.getByLabel(/last name/i).first();
  if (await lastNameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await lastNameInput.fill(defaults.lastName);
  }

  const addressInput = page.getByLabel(/address/i).first();
  if (await addressInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addressInput.fill(defaults.address);
  }

  const cityInput = page.getByLabel(/city/i).first();
  if (await cityInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await cityInput.fill(defaults.city);
  }

  const postalInput = page.getByLabel(/postal|zip/i).first();
  if (await postalInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await postalInput.fill(defaults.postalCode);
  }

  const phoneInput = page.getByLabel(/phone/i).first();
  if (await phoneInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await phoneInput.fill(defaults.phone);
  }
}

/**
 * Selects a payment provider on the checkout page if the option exists.
 */
export async function selectPaymentProvider(
  page: Page,
  provider: PaymentProvider,
): Promise<boolean> {
  const providerOption = page.locator(
    `[data-testid="payment-${provider}"], [data-provider="${provider}"], input[value="${provider}"]`,
  ).first();

  if (await providerOption.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await providerOption.click();
    return true;
  }
  return false;
}

/**
 * Clicks the final pay/submit button on checkout.
 */
export async function clickPayButton(page: Page): Promise<void> {
  const payBtn = page.getByTestId("checkout-submit-pay");
  await expect(payBtn).toBeVisible({ timeout: 10_000 });
  await payBtn.click();
}

/**
 * Checks that the order confirmation page (or success state) appears
 * after a successful payment flow.
 */
export async function expectOrderConfirmation(page: Page): Promise<void> {
  await expect(
    page
      .getByRole("heading", { name: /order.*confirm|thank you|success/i })
      .or(page.getByTestId("order-confirmation"))
      .or(page.locator("[data-order-id]")),
  ).toBeVisible({ timeout: 60_000 });
}
