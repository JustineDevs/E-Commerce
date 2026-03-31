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
3. After logging in, click **New +** → **Web Service**.
4. Connect your GitHub account if prompted, then select your repository.
5. Render will read `render.yaml` from the repo. Click **Create Web Service**.
6. When the deploy finishes, copy your service URL from the top (e.g. `https://maharlika-medusa.onrender.com`).
7. Add environment variables (database, secrets) in the **Environment** tab. A developer can provide the exact values.

---

## Stripe (Card Payments)

**URL:** https://dashboard.stripe.com

**What you get:** API keys (publishable and secret) and webhook signing secret.

**Payment required?** No signup fee. Stripe charges per transaction.

**Steps:**

1. Go to https://dashboard.stripe.com and sign up or log in.
2. For testing, use **Test mode** (toggle in the top right). For live payments, switch to **Live mode**.
3. Click **Developers** in the left menu.
4. Click **API keys**. You will see:
   - **Publishable key** (starts with `pk_`) — safe to share.
   - **Secret key** (starts with `sk_`) — click **Reveal** and copy. Keep this private.
5. Click **Webhooks** → **Add endpoint**. Enter your webhook URL (a developer will provide this). Copy the **Signing secret** (starts with `whsec_`).

---

## PayPal

**URL:** https://developer.paypal.com

**What you get:** Client ID and Client Secret for accepting PayPal payments.

**Payment required?** No signup fee. PayPal charges per transaction.

**Steps:**

1. Go to https://developer.paypal.com and log in with your PayPal account (or create one).
2. Click **Apps & Credentials** in the top menu.
3. Under **REST API apps**, click **Create App**.
4. Name the app (e.g. "Maharlika Apparel") and click **Create App**.
5. You will see **Client ID** and **Secret**. Click **Show** next to Secret and copy both.
6. For testing, use **Sandbox**. For live payments, use **Live** (you may need business verification).

---

## PayMongo (Philippines)

**URL:** https://dashboard.paymongo.com

**What you get:** Secret key and webhook secret. Used for GCash, Maya, cards, e-wallets, BillEase in the Philippines.

**Payment required?** No signup fee. PayMongo charges per transaction. **Business verification (KYC) is required** before going live.

**Steps:**

1. Go to https://dashboard.paymongo.com and sign up or log in.
2. Complete your **business verification** (KYC) when prompted. This is required to accept real payments.
3. In the left menu, go to **Developers** → **API Keys**.
4. Copy your **Secret key** (starts with `sk_live_` for production or `sk_test_` for testing).
5. Go to **Developers** → **Webhooks**.
6. Click **Create Webhook**. Enter your webhook URL (a developer will provide this). Select event `link.payment.paid`.
7. Copy the **Webhook Signing Secret** (starts with `whsk_`).

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
3. Go to **Settings** → **API** (or similar) to get your **Secret Key**.
4. Activate **Checkout** and **Invoicing** if not already done.
5. Go to **Settings** → **Webhooks** and add your webhook URL (a developer will provide this). Select event `PAYMENT_SUCCESS`.
6. Copy the **Webhook Secret** if shown.

---

## AfterShip (Shipment Tracking)

**URL:** https://admin.aftership.com

**What you get:** API key for shipment tracking (e.g. J&T Express Philippines).

**Payment required?** Free tier available. Paid plans for higher volume.

**Steps:**

1. Go to https://admin.aftership.com and sign up or log in.
2. In the left menu, go to **App Center** or **Settings** → **API**.
3. Create an API key. Copy it and store it safely.

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
