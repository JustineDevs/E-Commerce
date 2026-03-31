# Weakness register

## W1: Broad storefront middleware matcher
- **Component:** `apps/storefront/middleware.ts` `config.matcher` covers almost all routes.
- **Weakness:** Every request pays auth middleware cost; edge cases for static and API routes need care.
- **Why it matters:** Performance and subtle auth behavior on unintended paths.

## W2: Dual NextAuth applications
- **Component:** Storefront and admin each run NextAuth.
- **Weakness:** Cookie and callback URL configuration drift between environments.
- **Why it matters:** Ghost login states across subdomains.

## W3: Helmet CSP disabled on Express
- **Component:** `apps/api/src/index.ts`.
- **Weakness:** If HTML responses are added later, XSS protection is off by default.
- **Why it matters:** Future footgun.

## W4: CORS allow-all with no origin in dev
- **Component:** `cors` callback allows null origin path in some branches.
- **Weakness:** Mis-set `NODE_ENV` could widen access.
- **Why it matters:** Cross-origin data reads if combined with credentials bugs.

## W5: Redis fake in Medusa dev
- **Component:** Medusa build log "fake redis".
- **Weakness:** Dev behavior diverges from production queue and cache semantics.
- **Why it matters:** Bugs appear only in prod.

## W6: Operator misunderstanding of BYOK vs file env
- **Component:** Documentation split across `.env.example`, `medusa-config`, admin UI.
- **Weakness:** Two sources of truth unless `PAYMENT_CREDENTIALS_SOURCE` is explicit.
- **Why it matters:** Wrong keys used at runtime.

## W7: Review and form spam surface
- **Component:** Public `reviews` and `forms` API routes.
- **Weakness:** Rate limits may not cover all abuse patterns.
- **Why it matters:** DB bloat and SEO spam.
