# Payment Integration Guide

This document describes the payment providers integrated into the Maharlika Apparel e-commerce platform.

## Overview

| Provider | Methods | Use Case |
|----------|---------|----------|
| **Lemon Squeezy** | Card, Stripe, PayPal | International; Merchant of Record |
| **Paymongo** | GCash, cards, BillEase, e-wallets | Philippines |
| **PayMaya (Maya)** | GCash, Maya wallet, cards, QRPH | Philippines |

---

## 1. Lemon Squeezy (Stripe & PayPal)

Lemon Squeezy acts as a **Merchant of Record** and can accept:
- Credit/debit cards (via Stripe)
- PayPal
- Direct card payments

### Setup

1. Create a [Lemon Squeezy](https://lemonsqueezy.com) account.
2. In **Settings → Store**, enable Stripe and PayPal as payment methods.
3. Get credentials from **Settings → API**:
   - API Key
   - Store ID
   - Checkout Variant ID (for one-time purchases)
   - Webhook Signing Secret

### Environment (Medusa)

```env
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_CHECKOUT_VARIANT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
```

### Storefront

Default payment method. Customers select **"Lemon Squeezy (Card, Stripe, PayPal)"** on the checkout page.

### Webhooks

Register webhook URL in Lemon Squeezy: `https://your-medusa-backend.fly.dev/hooks/payment/lemonsqueezy`

---

## 2. Paymongo (GCash)

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

Customers select **"GCash / PayMongo"** on checkout. They are redirected to Paymongo’s hosted payment page.

### Webhooks

Register: `https://your-medusa-backend.fly.dev/hooks/payment/paymongo`

---

## 3. PayMaya (Maya)

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

Customers select **"Maya (GCash, cards, e-wallets)"** on checkout. They are redirected to Maya’s hosted invoice page.

### Webhooks

Register: `https://your-medusa-backend.fly.dev/hooks/payment/maya`

Maya recommends **IP whitelisting** for webhook security:
- Sandbox: `13.229.160.234`, `3.1.199.75`
- Production: `18.138.50.235`, `3.1.207.200`

---

## Checkout Flow

1. Customer adds items to bag and goes to `/checkout`.
2. Customer selects a payment method (Lemon Squeezy, Paymongo, or Maya).
3. Customer clicks **Continue to secure payment**.
4. Medusa creates a cart, initiates a payment session for the chosen provider.
5. Customer is redirected to the provider’s hosted checkout page.
6. After payment, provider sends a webhook to Medusa.
7. Medusa completes the order and updates the cart/order status.

---

## Provider IDs (Medusa)

| Provider | ID |
|----------|-----|
| Lemon Squeezy | `pp_lemonsqueezy_lemonsqueezy` |
| Paymongo | `pp_paymongo_paymongo` |
| Maya | `pp_maya_maya` |

These IDs are used when configuring `NEXT_PUBLIC_MEDUSA_PAYMENT_PROVIDER_ID` for a default provider, or when selecting a provider on the checkout page.

---

## MCP and Skills

When working on payment features in Cursor:

1. **MCP servers** (enable in Cursor settings):
   - **Stripe** – Create orders, refunds, subscriptions; search docs; fetch resources by ID.
   - **PayPal** – Create/capture orders, refunds, disputes; list transactions, invoices.

2. **Skills** (from `skills-lock.json`; source: wshobson/agents):
   - **stripe-integration** – Use for Stripe and Lemon Squeezy card flows.
   - **paypal-integration** – Use for PayPal and Lemon Squeezy PayPal flows.

3. **Configuration**:
   - Root: `.env.example` → `NEXT_PUBLIC_MEDUSA_*`, `MEDUSA_*` (client config).
   - Medusa: `apps/medusa/.env.template` → provider keys, webhook secrets.

---

## References

- [Lemon Squeezy Docs](https://docs.lemonsqueezy.com)
- [PayMongo Docs](https://developers.paymongo.com)
- [Maya Developer Hub](https://developers.maya.ph)
