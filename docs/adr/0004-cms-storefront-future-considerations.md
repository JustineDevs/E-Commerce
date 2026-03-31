# ADR 0004: CMS and public storefront — future considerations (backlog)

## Status

Proposed

## Context

The platform ships CMS-backed pages, blog, redirects, announcements, A/B experiments, public forms, and Supabase Storage for media. Several enhancements were deferred from a sprint and are captured here so they stay traceable and can each later become an accepted ADR or implementation task.

## Decision

No binding architecture is chosen in this record. The following items are **explicit backlog** for product and engineering to schedule. Each item should be revisited with its own threat model, data-ownership check (`docs/data-ownership.md`), and RBAC impact before implementation.

### 1. Edge middleware caching for CMS redirects and wildcards

- **Intent:** Resolve `cms_redirects` at the edge with short TTL caching to reduce origin load and latency.
- **Scope to define:** Cache key (path + locale + query preservation rules), invalidation when admin updates redirects, and support for **wildcard** `from_path` patterns with safe matching order.
- **Affected surfaces:** Storefront middleware or edge config, Supabase read path (anon vs service), admin redirect APIs.

### 2. Announcement frequency caps and audience segmentation

- **Intent:** Limit how often a user sees an announcement and vary content by **anonymous vs authenticated** (or richer segments).
- **Scope to define:** Storage for caps (cookie, localStorage, server session), rules per `cms_announcement` row, and interaction with existing dismiss + analytics events.
- **Affected surfaces:** `CmsAnnouncementBar`, announcement APIs, optional platform-data helpers.

### 3. Turnstile / reCAPTCHA on public forms

- **Intent:** Add vendor CAPTCHA verification in addition to existing honeypot and rate limiting on public form POST handlers.
- **Scope to define:** Provider choice, server-side verify endpoint, failure UX, accessibility, and env secrets per environment.
- **Affected surfaces:** `apps/storefront/src/app/api/forms/[formKey]/route.ts`, admin form settings schema if site keys are configurable.

### 4. Signed URLs and image transformation presets

- **Intent:** Support **private** Storage buckets via time-limited signed URLs and optional transformation presets (sizes, formats).
- **Scope to define:** Which assets remain public vs signed, TTL, admin UX for picking variants, and CDN compatibility.
- **Affected surfaces:** Admin media upload and public image URLs, `cms_media` metadata, storefront `next/image` remote patterns.

### 5. Deterministic server-set A/B experiment cookies

- **Intent:** Assign experiment variants with **first-party Set-Cookie** (or middleware) so crawlers and first paint see a stable variant aligned with SEO needs.
- **Scope to define:** Assignment key (anonymous id cookie vs session), consistency with existing `cms_ab_*` cookies, and traffic_cap / date window rules from `cms_ab_experiments`.
- **Affected surfaces:** Storefront middleware or layout response headers, `CmsExperimentAssigner` client logic, experiment impression accounting.

### 6. Webhook signing secrets and retry queues for form submissions

- **Intent:** HMAC (or similar) signatures on outbound `cms_form_submission` webhooks and **at-least-once** delivery with retries and dead-letter visibility.
- **Scope to define:** Secret rotation, header names, idempotency keys for receivers, queue implementation (DB table vs worker vs external queue).
- **Affected surfaces:** `getCmsFormSettings` / webhook dispatch in storefront forms route, admin form settings UI, optional `apps/api` worker.

## Consequences

- This ADR does **not** change runtime behavior.
- Implementing any item above should update this file to **Accepted** only if the team agrees the whole bundle is decided; otherwise **split** into smaller ADRs (e.g. one per numbered item) and move accepted ones to `docs/archived/adr/` per `docs/adr/README.md`.

## References

- `docs/data-ownership.md`
- `docs/cms-experiment-storefront-keys.md`
- Storefront form handler: `apps/storefront/src/app/api/forms/[formKey]/route.ts`
- CMS redirects (storefront): `apps/storefront/src/lib/cms-redirect.ts`
