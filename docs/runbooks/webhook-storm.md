# Runbook: Webhook Storm

## Severity: P1
## Owner: Platform / Backend team

## Symptoms
- Sudden spike in webhook requests (10x+ normal volume)
- API latency degradation
- Rate limit responses from webhook endpoints
- Duplicate order processing events

## Diagnosis Steps

1. Check webhook endpoint request rates in logs
2. Verify dedup store is operational
3. Identify the provider generating the storm
4. Check if a batch operation or provider retry is causing the spike

## Resolution Steps

1. **Immediate**: Webhook dedup layer should prevent duplicate processing
2. If dedup is overwhelmed:
   - Temporarily increase rate limits for webhook endpoints
   - Enable request queuing if available
3. If caused by provider retry storm:
   - Acknowledge webhooks with 200 even if processing is delayed
   - Queue processing for background execution
4. If caused by misconfigured provider:
   - Contact provider support
   - Temporarily disable webhook endpoint for that provider
   - Set feature flag: `FEATURE_FLAG_{PROVIDER}=0`

## Prevention
- Ensure all webhook handlers return 200 quickly
- Provider-specific dedup lives under `apps/medusa/src/lib/` (for example `paypal-webhook-dedup.ts`, `paymongo-webhook-dedup.ts`, `maya-webhook-dedup.ts`, `aftership-webhook-dedup.ts`)
- Monitor webhook volume as an SLO metric
