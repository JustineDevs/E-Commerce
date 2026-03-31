# Sad path register

## SP1: Medusa down during storefront SSR
- **Path:** Shop and PDP data fetches.
- **Expected:** User-visible error or degraded page with retry.
- **Risk:** Blank or cached stale prices if error boundaries swallow failures.
- **Files to check:** `apps/storefront/src/lib/catalog-fetch.ts`, product pages.

## SP2: Supabase down during admin CMS save
- **Path:** Admin CMS API routes.
- **Expected:** 503 with message.
- **Risk:** Optimistic UI shows saved when rollback needed.

## SP3: Expired customer session at checkout payment step
- **Path:** Checkout client and Medusa cart completion.
- **Expected:** Redirect to sign-in with return URL or clear cart message.
- **Risk:** Payment succeeds but order not attached to customer.

## SP4: Double-click submit on POS commit
- **Path:** `commit-sale` API.
- **Expected:** Idempotent order creation or duplicate detection.
- **Risk:** Two orders; **CRITICAL** if unguarded.

## SP5: Webhook delivered twice
- **Path:** PSP webhook handlers in Medusa.
- **Expected:** Dedup store or idempotent workflow.
- **Risk:** Double capture or duplicate state transitions; tests recently removed from repo per status.

## SP6: Invalid internal key on chat intake
- **Path:** `apps/admin/src/app/api/integrations/chat-orders/intake/route.ts`.
- **Expected:** Reject or require staff with `chat_orders:manage`.
- **Actual:** Handler sets `useInternal` only when header matches `INTERNAL_CHAT_INTAKE_KEY`; otherwise runs `requireStaffSession` and permission check. Wrong key without staff session yields staff JSON error path, not silent accept.
- **Risk:** Middleware still runs first; API clients should send `Accept: application/json` to avoid HTML from auth redirects in edge cases.

## SP7: Malformed JSON in payment connection ciphertext
- **Path:** Decrypt in admin or Medusa emitter.
- **Expected:** Clear operator error, no crash.
- **Risk:** Medusa boot failure on platform mode if row corrupt.

## SP8: Empty catalog seed
- **Path:** New environment first boot.
- **Expected:** Storefront shows empty state, not infinite loading.
- **Risk:** SEO indexing of empty shop if misread as error.

## SP9: Loyalty deduction without order
- **Path:** Loyalty points APIs.
- **Expected:** Transaction tied to `medusa_order_id` when required.
- **Risk:** Ledger drift from Medusa refunds.
