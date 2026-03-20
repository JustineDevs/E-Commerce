# OWASP-aligned controls (Apparel Commerce API + apps)

This document maps **OWASP Top 10 (2021)** categories to **implemented code paths** in `apparel-commerce`. It does **not** claim formal ASVS certification; use it for audits and ticket backlogs.

| ID | Category | Implemented mitigations | Key files / notes |
|----|----------|-------------------------|-------------------|
| **A01** | Broken access control | Public tracking requires **HMAC `?t=`** (404 on miss); **POST /checkout** requires **GET /checkout/intent** + **single-use, time-bound `intentToken`**; privileged routes use **internal API key**; **explicit RLS deny for `anon`** on sensitive tables | `publicOrders.ts`, `checkout.ts`, `checkoutIntent.ts`, `requireInternalApiKey.ts`, `supabase/migrations/rls_deny_anon_sensitive.sql` |
| **A02** | Cryptographic failures | Webhook **HMAC** (Lemon, AfterShip); tracking **HMAC-SHA256** + **timing-safe** compare; intents signed with **HMAC**; **TLS** is deployment | `webhooks.*`, `trackingToken.ts`, `checkoutIntent.ts` |
| **A03** | Injection | **Supabase client** (parameterized); catalog **`sanitizeIlikeTerm`** | `packages/database`, `products.ts` |
| **A04** | Insecure design | Order create **status whitelist**; inventory movements **only when `paid`** (web/POS rules); **structured `order_created_internal_api`** event for POS/OMS trust boundary | `orders-create.ts`, `orders.ts`, `securityEvent.ts` |
| **A05** | Security misconfiguration | **Helmet** (CSP disabled for JSON API); **CORS** allowlist in prod; **`trust proxy`** when `TRUST_PROXY=true`; rate limits with **logging** | `index.ts`, `checkout.ts`, `products.ts`, `publicOrders.ts` |
| **A06** | Vulnerable components | **CI:** `pnpm audit --audit-level=high` (`.github/workflows/security-audit.yml`) | Add CodeQL/SAST per org policy |
| **A07** | Identification & auth failures | Admin **NextAuth + staff** (separate app); checkout **intent ties browser to server-minted secret** (not full customer identity) | `admin` auth; `checkout` intent |
| **A08** | Software & data integrity | Webhook **idempotency** (`webhook_events`); **Lemon checkout URL** validated to **`*.lemonsqueezy.com` HTTPS** | `webhooks.*`, `lemonsqueezy.ts` |
| **A09** | Logging & monitoring failures | **`security_event`** JSON lines (`type`, `event`, `requestId`, `ip`, `path`, …); **rate_limit_***, **webhook_signature_rejected**, **internal_api_key_rejected**, **checkout_intent_rejected**; **application_error** JSON on 5xx | `securityEvent.ts`, `errorHandler.ts`, route handlers |
| **A10** | SSRF | Outbound **fetch** to fixed Lemon API; **response checkout URL host allowlist** | `lemonsqueezy.ts`; future URL fetch must use allowlists |

## Operational checklist

1. **Production:** `INTERNAL_API_KEY`, `TRACKING_LINK_SECRET`, `CORS_ORIGIN`, `TRUST_PROXY=true` behind a reverse proxy.
2. **Database:** Apply `rls_deny_anon_sensitive.sql` after `enable_rls.sql` on Supabase.
3. **SIEM:** Ship stdout JSON (`security_event`, `application_error`) to your log stack; alert on `webhook_signature_rejected` spikes.
4. **skills-lock.json** `owasp-security` entry only pins a skill repo — it is **not** a compliance certificate.
