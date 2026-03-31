# Caveat register

## CV1: Static audit vs runtime truth
This audit does not replace hitting real endpoints with real keys. Many classifications are **inferred** from structure.

## CV2: Git status shows large WIP surface
Many new admin files are untracked or modified; completeness and RBAC may be in flux. Re-audit after merge stabilization.

## CV3: Medusa and Supabase may share a host in some deployments
Schema dumps can list Medusa tables beside platform tables. Runtime ownership still follows `data-boundaries.ts`; operators must not run migrations against wrong DB role.

## CV4: Platform payment env overrides file `.env` keys
When platform source is on, same-named env vars from Supabase replace file values. Operators editing only `.env` may see no effect. **Caveat** for debugging.

## CV5: Terminal agent is loopback-only by design
Remote exposure would be a critical security error; firewall and bind address matter in operator setup.

## CV6: Compliance export includes `medusa_error` field
Partial failures still return 200 with embedded error strings; clients must handle mixed success.

## CV7: Build log warnings do not fail CI today
Warnings in Next build (ESLint) may become errors if `eslint.ignoreDuringBuilds` changes.

## CV8: Region preference for payment connections
`MEDUSA_PAYMENT_REGION_ID` affects which encrypted row is chosen. Wrong env means wrong PSP account for a region.
