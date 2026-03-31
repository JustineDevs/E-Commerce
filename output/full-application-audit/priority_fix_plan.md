# Priority fix plan

## Immediate fixes
1. Run full `pnpm run build` after syncing latest; Medusa `emit-platform-payment-env.ts` already uses dynamic `import()` for `@apparel-commerce/payment-connection-crypto` (addresses TS1479 in user log if tree matches).
2. Grep every new `apps/admin/src/app/api/**/route.ts` for auth and permission guards; fix any missing `requireStaffSession` (or equivalent).
3. Read `channels/webhook` handler and document or implement signature verification.

## Next sprint fixes
1. Restore payment webhook unit or integration tests where stress tests were deleted.
2. Fix ESLint unused vars in storefront `analytics.ts`, admin `AdminCommandPalette.tsx`, `VariantOptionField.tsx`, `scene-schema.ts`.
3. Align ESLint with Next.js plugin recommendation for both Next apps.

## Medium-term refactors
1. Extract shared types for payment connection secrets (admin + Medusa emitter).
2. Consolidate Medusa HTTP clients in admin.
3. Standardize admin API JSON error shape `{ code, message, requestId? }`.

## Long-term architecture cleanup
1. Evaluate lazy vs eager BYOK loading for Medusa availability SLO.
2. Consider single sign-on story between storefront and staff if same org uses both daily (product decision).

## Testing priorities
1. Checkout happy path per PSP enabled in staging.
2. Webhook duplicate delivery simulation.
3. POS commit double-submit.
4. Compliance export and erasure with `INTERNAL_API_KEY`.

## Security priorities
1. RLS audit on `payment_connections` and review policies for service role usage patterns.
2. Rate limit review on public `reviews` and `forms` routes.
3. Secret redaction audit in admin error logging paths.
