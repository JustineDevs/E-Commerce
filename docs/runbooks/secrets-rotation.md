# Secrets Rotation Runbook

## Scope
All BYOK-managed payment service provider credentials stored in Supabase `payment_connections`.

## Pre-rotation Checklist
- [ ] Confirm new credentials generated in provider dashboard (do not revoke old ones yet)
- [ ] Confirm Medusa is healthy (`/health` returns 200)
- [ ] Confirm webhook endpoints are reachable for each provider
- [ ] Notify team in operations channel

## Rotation Steps

### Step 1: Update BYOK rows (encrypted `secret_ciphertext`)

Do **not** paste secrets with raw SQL. `public.payment_connections` stores **envelope-encrypted** payloads in `secret_ciphertext` (see migrations `013_payment_connections.sql` and `014_payment_connections_envelope_crypto.sql`).

Use the staff admin API so crypto and hints stay correct:

- **Rotate in place:** `POST /api/admin/payment-connections/{id}/rotate` with a JSON body containing the new `secrets` object your app expects (same shape as create/update flows). Requires staff session with `settings:write`.
- **Or** create a new connection and disable the old one via the existing payment-connection routes under `/api/admin/payment-connections`.

### Step 2: Restart Medusa to hydrate new credentials
```bash
pnpm --filter medusa dev
```
or in production: trigger redeployment on hosting platform.

### Step 3: Verify credential hydration
```bash
curl -s http://localhost:9000/admin/payment-health | jq .
```
Confirm `TARGET_PROVIDER` shows `status: "healthy"`.

### Step 4: Verify webhook endpoints
For each provider, send a test webhook from the provider dashboard.
- Stripe: Use Stripe CLI `stripe trigger payment_intent.succeeded`
- PayPal: Send test webhook from PayPal developer dashboard
- PayMongo: Use PayMongo sandbox to create a test payment
- Maya: Trigger sandbox payment flow
- AfterShip: Update a test tracking number

### Step 5: Revoke old credentials
After confirming new credentials work for at least 1 hour:
1. Revoke old API keys in provider dashboard
2. Delete old webhook signing secrets

### Step 6: Verify no errors
```bash
# Check Medusa logs for auth errors
pnpm --filter medusa test:unit -- --testPathPattern="psp-sandbox" --silent
```

## Rollback
If new credentials fail:
1. Restore the previous connection payload (re-rotate with the prior secrets, or restore a DB backup of the row) so `secret_ciphertext` matches the last known good material
2. Restart Medusa
3. Verify health endpoint
4. Investigate root cause before re-attempting rotation

## Schedule
- Payment provider keys: rotate every 90 days
- Webhook signing secrets: rotate every 180 days
- Supabase service role key: rotate every 90 days (coordinate with all apps)

## Provider-Specific Notes

### Stripe
- Generate new restricted key with same permissions
- Submit the new values through the staff **rotate** API so they are encrypted into `secret_ciphertext`. After Medusa hydrates BYOK, they appear as `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc. (see `payment-provider-secret-env-map` in the Medusa app)
- Stripe supports key rolling (old key often valid for a window after the new key activates)

### PayPal
- Generate new REST API credentials in PayPal developer portal
- Rotate via admin API; mapped env names include `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- PayPal webhook ID changes require re-subscribing webhook events

### PayMongo
- Generate new secret key in PayMongo dashboard
- Rotate via admin API; mapped names include `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`

### Maya
- Generate new API keys in Maya merchant portal
- Rotate via admin API; mapped names include `MAYA_SECRET_KEY`, `MAYA_PUBLIC_KEY`, `MAYA_WEBHOOK_SECRET`

### AfterShip
- Generate new API key in AfterShip settings
- Rotate via admin API; mapped names include `AFTERSHIP_API_KEY`, `AFTERSHIP_WEBHOOK_SECRET`
