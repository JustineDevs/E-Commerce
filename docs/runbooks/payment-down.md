# Runbook: Payment Provider Down

## Severity: P0
## Owner: Platform / Payments team

## Symptoms
- Orders failing at checkout with payment errors
- Integration health dashboard shows provider as "down"
- Webhook processing backlog growing
- Customer reports of failed payments

## Diagnosis Steps

1. Check integration health dashboard: `/admin/settings/integrations`
2. Check provider status page (Stripe, PayPal, PayMongo, Maya)
3. Check Medusa logs for payment errors on your host (Render, Docker, or the terminal running `pnpm --filter medusa dev`). The Medusa package does not define a `logs` script.
4. Verify API keys are valid: `curl -s http://localhost:9000/admin/payment-health | jq .`
5. Check circuit breaker state: look for "circuit open" in logs

## Resolution Steps

### If provider is down (external outage)
1. Enable alternative payment providers if available
2. Update storefront to hide affected payment method
3. Set feature flag: `FEATURE_FLAG_{PROVIDER}=0`
4. Monitor provider status page for resolution
5. Re-enable when provider confirms recovery
6. Process queued webhooks

### If credentials expired
1. Follow secrets rotation runbook: `docs/runbooks/secrets-rotation.md`
2. Verify health after rotation

### If circuit breaker is open
1. Wait for half-open window (30s default)
2. If persistent, check provider connectivity directly
3. Reset circuit breaker if provider is healthy: restart Medusa

## Communication
- Notify #ops channel immediately
- Update status page if customer-facing impact exceeds 5 minutes
- Post-incident review within 24 hours
