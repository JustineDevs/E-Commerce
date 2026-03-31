# Routes review

## Storefront Next.js API (`apps/storefront/src/app/api/**`)

| Route group | Auth | Reads | Writes | Validation | Idempotency | Notes |
|-------------|------|-------|--------|------------|-------------|-------|
| `/api/cart/*` | Session or anonymous context | Medusa | Medusa cart | Varies by route | Merge routes need careful design | **FRAGILE** under multi-tab |
| `/api/reviews` | Likely public or session | Supabase reviews | Insert review | Must be strict | Duplicate review **risk** | Rate limit |
| `/api/shop/*` | Public | Medusa | Read-only | Query validation | N/A | Cache headers matter |
| `/api/health`, `/api/health/sop` | Public | App checks | None | N/A | N/A | Must not leak secrets |

## Admin Next.js API (`apps/admin/src/app/api/admin/**`)

| Route group | Auth | Reads | Writes | Notes |
|-------------|------|-------|--------|-------|
| `/api/admin/*` | Staff session via middleware | Supabase, Medusa, both | Varies | **Large surface**; each handler must re-validate permission |
| `/api/admin/payment-connections/*` | Staff | Supabase `payment_connections` | CRUD, rotate, verify | **HIGH** sensitivity; audit actor formatting |
| `/api/admin/audit-logs` | Staff | Supabase | Read | OK if read-only |
| `/api/pos/medusa/*` | Staff | Medusa | Orders, drafts | POS **CRITICAL** |

## Admin integrations (`/api/integrations/*`)

| Route | Auth | Notes |
|-------|------|-------|
| `channels/webhook` | **Unauthenticated** bypass in middleware | HMAC-SHA256 verified in `channels/webhook/route.ts` when secret configured; gate rejects missing secret per deploy env |
| `chat-orders/intake` | Internal key OR staff session | If key unset, only staff; machine clients may get HTML login |

## Medusa (`apps/medusa/src/api/**`)

| Concern | Notes |
|---------|-------|
| Store routes | Public/customer scoped; CORS and publishable keys |
| Webhooks | HMAC and dedup per module; confirm tests exist after stress test removals |
| Custom store routes | Example `carts/[id]/loyalty` bridges to loyalty; **PARTIAL** boundary |

## Express `apps/api`

| Route | Auth | Notes |
|-------|------|-------|
| `/health` | Public | Should reflect dependency truth |
| `/compliance/*` | `INTERNAL_API_KEY` | **ALIGNED**; rate limited |

## Recommendations

1. Inventory every `/api/integrations` webhook for signature verification (grep `webhook` and `signature`).
2. Add integration tests that call admin APIs with forbidden roles.
3. Document which admin routes are Medusa-only vs Supabase-only vs hybrid to avoid dual-write mistakes.
