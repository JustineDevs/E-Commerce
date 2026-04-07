# How to Obtain Credentials

Step-by-step guide for non-technical users. Each section explains where to go, what to click, and whether payment or verification is required.

---

## Render (Backend Hosting)

**URL:** https://render.com

**What you get:** A place to run the commerce backend. You will get a URL (e.g. `https://your-app.onrender.com`) after setup.

**Payment required?** No for the free tier. Free services spin down when idle; paid plans keep them running.

**Steps:**

1. Go to https://render.com and click **Get started** or **Sign in**.
2. Sign up with **GitHub** (recommended) or email.

---

## Stripe (Card Payments)

**URL:** https://dashboard.stripe.com

**What you get:** API keys (publishable and secret) and webhook signing secret.

**Payment required?** No signup fee. Stripe charges per transaction.

**Steps:**

1. Go to https://dashboard.stripe.com and sign up or log in.

---

## PayPal

**URL:** https://developer.paypal.com

**What you get:** Client ID and Client Secret for accepting PayPal payments.

**Payment required?** No signup fee. PayPal charges per transaction.

**Steps:**

1. Go to https://developer.paypal.com and log in with your PayPal account (or create one).
2. Click **Apps & Credentials** in the top menu.

---

## PayMongo (Philippines)

**URL:** https://dashboard.paymongo.com

**What you get:** Secret key and webhook secret. Used for GCash, Maya, cards, e-wallets, BillEase in the Philippines.

**Payment required?** No signup fee. PayMongo charges per transaction. **Business verification (KYC) is required** before going live.

**Steps:**

1. Go to https://dashboard.paymongo.com and sign up or log in.
2. Complete your **business verification** (KYC) when prompted. This is required to accept real payments.
3. In the left menu, go to **Developers** → **API Keys**.

---

## Maya (Philippines)

**URLs:**  
- Developer docs: https://developers.maya.ph  
- Business manager: https://pbm.paymaya.com

**What you get:** Secret key and webhook secret. Used for Maya Checkout, GCash, Maya wallet, cards, QRPH in the Philippines.

**Payment required?** No signup fee. Maya charges per transaction. **Business onboarding** is required for live payments.

**Steps:**

1. Go to https://pbm.paymaya.com and sign up for **Maya Business Manager**.
2. Complete business onboarding and activation.

---

## AfterShip (Shipment Tracking)

**URL:** https://admin.aftership.com

**What you get:** API key for shipment tracking (e.g. J&T Express Philippines).

**Payment required?** Free tier available. Paid plans for higher volume.

**Steps:**

1. Go to https://admin.aftership.com and sign up or log in.
2. In the left menu, go to **App Center** or **Settings** → **API**.

---

## Summary: Do I Need to Pay?

| Service      | Signup fee | To get API keys      | For live transactions  |
|-------------|------------|----------------------|------------------------|
| Render      | No         | Free tier OK         | Paid plans for always-on |
| Stripe      | No         | Free                 | % per transaction      |
| PayPal      | No         | Free                 | % per transaction      |
| PayMongo    | No         | KYC required         | % per transaction      |
| Maya        | No         | Business onboarding  | % per transaction      |
| AfterShip   | No         | Free tier OK         | Paid for higher volume |

Hand these credentials to your developer. They will configure them in the correct system (Render, Vercel, etc.).
