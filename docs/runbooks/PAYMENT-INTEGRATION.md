# Payment Integration Guide

This document describes the payment providers integrated into the Maharlika Apparel e-commerce platform (Medusa v2).

## Overview

| Provider | Methods | Use Case |
|----------|---------|----------|
| **Stripe** | Cards, wallets, regional methods (per Stripe Dashboard) | International and configurable per region |
| **PayPal** | PayPal balance, cards | International |
| **Paymongo** | GCash, cards, BillEase, e-wallets | Philippines |
| **PayMaya (Maya)** | GCash, Maya wallet, cards, QRPH | Philippines |
| **Cash on delivery** | COD | In-person or configured regions |

Use `apps/medusa/medusa-config.ts` and **environment variables** on the Medusa process to enable providers per deployment. Restart Medusa after changing keys.

---

## 1. Stripe

1. Create or open a [Stripe](https://stripe.com) account.
2. Obtain **Secret key** and **Webhook signing secret** from the Stripe Dashboard.
3. Register Medusa webhook URL: `https://your-medusa-backend.example.com/hooks/payment/stripe` (exact path follows your Medusa route setup).

### Environment (Medusa)

Set `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, and related keys in the Medusa server environment (see root `.env.example` section 12).

---

## 2. PayPal

1. Create REST app credentials in the [PayPal Developer](https://developer.paypal.com) portal.
2. Configure sandbox vs live via `PAYPAL_ENVIRONMENT`.
3. Register PayPal webhooks to your Medusa PayPal hook URL.

### Environment (Medusa)

`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, etc. (see root `.env.example`).

---

## 3. Paymongo (GCash)

Paymongo supports Philippine payment methods:

- GCash
- Maya
- GrabPay
- Cards (Visa, Mastercard)
- BillEase (buy now, pay later)
- Online banking

### Setup

1. Create a [PayMongo](https://paymongo.com) account.
2. Complete business verification (KYC).
3. Get API keys from **Developers → API Keys**.
4. Create a webhook in **Developers → Webhooks** for `link.payment.paid`.

### Environment (Medusa)

```env
PAYMONGO_SECRET_KEY=sk_live_...   # or sk_test_ for sandbox
PAYMONGO_WEBHOOK_SECRET=whsk_...
```

### Storefront

Customers select **"GCash / PayMongo"** on checkout when that provider is enabled. They are redirected to Paymongo’s hosted payment page.

### Webhooks

Register: `https://your-medusa-backend.onrender.com/hooks/payment/paymongo`

---

## 4. PayMaya (Maya)

Maya provides:

- Maya Checkout (hosted page)
- Invoice API (payment links)
- GCash, Maya wallet, cards, QRPH

### Setup

1. Create a [Maya Business Manager](https://pbm.paymaya.com) account.
2. Activate Checkout and Invoicing.
3. Get Secret Key from **Settings → API**.
4. Register webhooks in **Settings → Webhooks** for `PAYMENT_SUCCESS`.

### Environment (Medusa)

```env
MAYA_SECRET_KEY=sk-...
MAYA_WEBHOOK_SECRET=   # Configure in Maya Business Manager if available
MAYA_SANDBOX=true      # Set to false for production
```

### Storefront

Customers select **"Maya (GCash, cards, e-wallets)"** on checkout when enabled. They are redirected to Maya’s hosted invoice page.

### Webhooks

Register: `https://your-medusa-backend.onrender.com/hooks/payment/maya`

Maya recommends **IP whitelisting** for webhook security:

- Sandbox: `13.229.160.234`, `3.1.199.75`
- Production: `18.138.50.235`, `3.1.207.200`

---

## Checkout Flow

1. Customer adds items to bag and goes to `/checkout`.
2. Customer selects an available payment method.
3. Customer clicks **Continue to secure payment**.
4. Medusa creates a cart, initiates a payment session for the chosen provider.
5. Customer completes payment on the provider’s hosted page (or COD flow) as applicable.
6. After payment, the provider sends a webhook to Medusa where configured.
7. Medusa completes the order and updates the cart/order status.

---

## Provider IDs (Medusa)

| Provider | Example ID |
|----------|------------|
| Stripe | `pp_stripe_stripe` (and region-specific Stripe method IDs as registered) |
| PayPal | `pp_paypal_paypal` |
| Paymongo | `pp_paymongo_paymongo` |
| Maya | `pp_maya_maya` |
| COD | `pp_cod_cod` |

These IDs are used when configuring `NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID` for a default provider, or when selecting a provider on the checkout page.

---

## MCP and Skills

When working on payment features in Cursor:

1. **MCP servers** (enable in Cursor settings):
   - **Stripe** – Create orders, refunds, subscriptions; search docs; fetch resources by ID.
   - **PayPal** – Create/capture orders, refunds, disputes; list transactions, invoices.

2. **Skills** (from `skills-lock.json`; source: wshobson/agents):

   - **stripe-integration** – Stripe setup and webhooks.
   - **paypal-integration** – PayPal setup and webhooks.

3. **Configuration**:
   - Root: `.env.example` → `NEXT_PUBLIC_MEDUSA_*`, `MEDUSA_*` (client config).
   - Medusa: `apps/medusa/.env.template` → provider keys, webhook secrets.

---

## References

- [Stripe Docs](https://stripe.com/docs)
- [PayPal REST APIs](https://developer.paypal.com/docs/api/overview/)
- [PayMongo Docs](https://developers.paymongo.com)
- [Maya Developer Hub](https://developers.maya.ph)
