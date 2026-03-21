# Webhook single-owner cutover checklist

One provider = **one active webhook base URL** per environment. Duplicate delivery must not double-apply business mutations (idempotency + dedupe).

## Lemon Squeezy

| Env | Public Medusa base | Webhook path (Medusa) | Express legacy (must be off when cut over) |
|-----|-------------------|-------------------------|---------------------------------------------|
| Local | `http://localhost:9000` | `/hooks/payment/lemonsqueezy_lemonsqueezy` (per Medusa payment module) | `http://localhost:4000/webhooks/lemonsqueezy` — disable with `LEGACY_EXPRESS_WEBHOOKS_DISABLED` |
| Staging | `https://<medusa-staging-host>` | Same hook path on Medusa | Express webhook URL **not** registered in Lemon dashboard |
| Production | `https://<medusa-prod-host>` | Same | Express webhook URL **not** registered |

**Signing secret:** one `LEMONSQUEEZY_WEBHOOK_SECRET` in **`apps/medusa/.env` only** (not duplicated in root `.env.example`).

## AfterShip

| Env | Medusa webhook | Express legacy |
|-----|----------------|----------------|
| Local | `http://localhost:9000` → `/hooks/aftership` or `src/api/hooks/aftership` route | `http://localhost:4000/webhooks/aftership` |
| Staging / Production | HTTPS Medusa host only | Disabled |

**Signing secret:** `AFTERSHIP_WEBHOOK_SECRET` in **`apps/medusa/.env` only**.

## Idempotency

- **Medusa:** `lemon_webhook_dedup` table + `claimLemonWebhookDedup` (`src/lib/lemon-webhook-dedup.ts`).
- **Express (legacy):** `webhook_events` table with unique `(provider, event_id)` before processing.

## Verification

1. Lemon dashboard shows **one** URL per environment.  
2. AfterShip dashboard shows **one** URL per environment.  
3. `LEGACY_EXPRESS_WEBHOOKS_DISABLED=true` in staging/prod before cutover.  
4. Test duplicate POST returns **200** with `duplicate: true` or Medusa dedupe returns non-first claim without double-processing.  
