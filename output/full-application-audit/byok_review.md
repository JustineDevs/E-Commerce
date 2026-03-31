# BYOK review

## Secret storage model

- Primary store: Supabase table `payment_connections` with `secret_ciphertext` (encrypted envelope).
- Crypto: `packages/payment-connection-crypto` (AES-GCM, optional AWS KMS integration for envelope).
- Admin writes ciphertext after validate flows in `apps/admin/src/lib/payment-connections.ts`.

## Encryption expectations

- Plaintext secrets exist only transiently in admin server memory during create, rotate, verify, and test.
- Medusa never stores plaintext in DB; it receives JSON env keys in memory at process start when platform source is enabled.

## Key management assumptions

- `PAYMENT_CONNECTIONS_MASTER_KEY` or KMS config must exist wherever decrypt runs (admin and Medusa emitter).
- Rotation of master key requires re-encrypt or dual-read strategy; **UNKNOWN** if fully automated (treat as operational gap if not documented).

## Plaintext exposure risk

- Admin UI "test" and "verify" flows may log errors; ensure no `console.log` of decrypted objects.
- Medusa `execFileSync` stdout is only JSON env map; stderr on failure could leak paths; keep errors generic in production logs.

## Admin workflow risks

- Misconfigured provider (sandbox keys in production mode) causes silent wrong-environment charges or failures.
- Multiple rows per provider and region: picker logic in `emit-platform-payment-env.ts` uses status rank and `MEDUSA_PAYMENT_REGION_ID`. Wrong region preference yields wrong connection. **FRAGILE**.

## Rotation gaps

- DB row `updated_at` and `secret_rotated_at` (if present on row) should drive UI truth; confirm admin shows last rotation to operators.
- Webhook secrets must be updated at PSP dashboard and in DB together; **PARTIAL** if UI does not remind.

## Provider onboarding caveats

- Each PSP has different secret shape (Stripe vs PayPal vs Lemon). Typed envelopes in code must match admin forms exactly or decrypt succeeds but env keys missing. **MISWIRED** risk on schema drift.

## Webhook secret handling

- Stored inside same ciphertext blob as API keys for some providers; compromise of ciphertext compromises all fields.

## Operational failure modes

- Supabase down at Medusa boot: `execFileSync` throws; Medusa may fail to start when `PAYMENT_CREDENTIALS_SOURCE` is platform. **Fail-closed** for boot, **fragile** for availability.
- Partial row set: some providers work, others missing; storefront checkout may show only some methods. **Operator confusion**.

## Recommended secure architecture

1. Short-lived tokens for Medusa to fetch secrets (future): avoid long-lived plaintext in env if threat model requires.
2. Separate KMS key per environment (prod vs staging).
3. Audit log every decrypt path in admin (who, when, connection id, action).
4. Health endpoint on Medusa that reports "payment providers configured" boolean without revealing values.
