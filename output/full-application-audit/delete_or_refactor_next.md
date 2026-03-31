# Delete or refactor next

## Dead code to delete
- Confirm removed Medusa stress test files are intentionally gone; if coverage is required, replace with smaller focused tests rather than leaving zero coverage.
- Sentry config files deleted from storefront per git status; remove any remaining imports or docs that still reference them.

## Fake abstractions to remove
- Analytics functions that accept parameters but never use them: either implement or replace with explicit no-op `function track(_event: string, _payload?: unknown) { /* intentionally empty */ }` and eslint exception only if needed.

## Duplicated logic to consolidate
- Cart API handlers (see `duplication_register.md` D3).
- Medusa HTTP helpers (D2).

## Legacy dependencies to retire
- Any storefront path still reading legacy Supabase commerce tables (if found): must be removed or clearly marked LEGACY; grep for tables in `MEDUSA_EXCLUSIVE_TABLE_NAMES`.

## UI to simplify
- Admin command palette: remove unused callback params or wire `open` state for accessibility.
- Variant option field: prefix unused `next` with `_` per lint rule.

## Rewrites worth planning
- BYOK boot: async secret hydration with health reporting instead of synchronous only.
- Integration intake: return consistent JSON errors for machine clients.
