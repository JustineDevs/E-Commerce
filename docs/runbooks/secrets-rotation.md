# Secrets rotation (payments and integrations)

Payment provider credentials for Medusa live in the **Medusa server environment** (for example the root `.env` loaded by `apps/medusa`, or your host’s secret manager). There is no admin UI in this repo that stores PSP keys.

## Stripe

1. Create a new restricted API key or roll the existing secret key in the Stripe Dashboard.
2. Update `STRIPE_API_KEY` (and `STRIPE_WEBHOOK_SECRET` if the webhook endpoint secret changed).
3. Restart Medusa.
4. Verify webhooks still reach `https://<medusa-host>/hooks/payment/stripe`.

## PayPal

1. Rotate client secret in the PayPal Developer portal when required.
2. Update `PAYPAL_CLIENT_SECRET` (and `PAYPAL_CLIENT_ID` / `PAYPAL_WEBHOOK_ID` if those changed).
3. Restart Medusa.

## PayMongo / Maya

1. Rotate keys in each provider’s dashboard.
2. Update `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `MAYA_SECRET_KEY`, `MAYA_WEBHOOK_SECRET` as applicable.
3. Restart Medusa and re-register webhooks if URLs or secrets changed.

## Aftership

Update `AFTERSHIP_API_KEY` and webhook signing secret in env; restart services that consume them.

## Supabase service role

`SUPABASE_SERVICE_ROLE_KEY` is used by admin and other apps for platform data (not for loading PSP secrets into Medusa in this codebase). Rotate per your security policy and update all deployment environments.
