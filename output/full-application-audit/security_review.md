# Security review

## Auth review

- **Storefront:** NextAuth middleware in `apps/storefront/middleware.ts` protects `/account`; other paths allow anonymous. Token presence is not full proof of Medusa customer sync; verify sign-in hooks merge cart correctly.
- **Admin:** `apps/admin/src/middleware.ts` uses `withAuth` and requires `token.role` in `admin` or `staff` for matched paths. **Guide demos** path adds email allowlist (`admin-allowed-emails`). This is an extra gate; keep list maintained or **UNSAFE** if stale.

## RBAC review

- Platform RBAC in Supabase (`staff_permission_grants` per `data-boundaries.ts`). Admin API routes should call shared helpers (`requireStaffSession`, `require-page-permission`). **UNKNOWN** without line-by-line audit of every new route in git status.

## Session review

- Two Next.js apps imply two session cookies if both run on different ports locally; production must use correct domains and `NEXTAUTH_URL` per app. **FRAGILE** if misconfigured.

## Secret handling review

- Medusa: file `.env` plus optional platform injection via `applyPlatformPaymentCredentialsFromSupabaseSync`. Precedence is "platform overrides same keys" per apply function comments.
- Admin: server-side only for service role; never expose in `NEXT_PUBLIC_*`.
- **BYOK:** ciphertext at rest; decrypt only on server. Risk: logging `error` objects that include payloads.

## Env handling review

- `apps/api/src/index.ts` fails boot in production without `INTERNAL_API_KEY`. Dev warns on open compliance. **ALIGNED**.
- Medusa `validate-process-env` warns on partial Resend and missing tracking HMAC. **FRAGILE** if ops ignore warnings.

## Webhook review

- Payment modules under `apps/medusa/src/modules/*-payment/`. Prior stress tests removed per git status; treat webhook dedup as **runtime-unproven** until tests restored.
- Admin `channels/webhook` bypasses auth in middleware; handler must verify provider signature.

## BYOK review

- See `byok_review.md`. Summary: service role on Medusa is equivalent power to admin API for reading connections.

## Review abuse and spam

- Product reviews and forms: need rate limiting (`storefront-api-rate-limit`) and content validation. **PARTIAL**.

## Unsafe route review

- Any route that mutates commerce or money without session or HMAC: grep for `export async function POST` without guard.
- Compliance routes without key in dev: **UNSAFE** by design in dev only.

## Public and private boundary

- Storefront must not import `MEDUSA_SECRET_API_KEY` in client bundles; rely on server components and route handlers.

## Data exposure review

- Order tracking links: `TRACKING_HMAC_SECRET` warning in Medusa env validator indicates scoped tokens matter for guessing order IDs.

## Missing hardening review

- CSP disabled in Express helmet config (`contentSecurityPolicy: false`). Intentional for API; if HTML ever served, revisit.
- Structured security event logging across admin actions: **PARTIAL**.

## Production abuse scenarios

1. Credential stuffing on both sign-in pages: use provider limits and CAPTCHA where appropriate (**UNKNOWN** if present).
2. Webhook replay: must be idempotent per PSP.
3. Internal key brute force on `/compliance`: rate limit exists; ensure production key strength.
4. Staff session theft: HTTPS, `Secure` cookies, short-lived sessions (**UNKNOWN** detail per NextAuth config).
