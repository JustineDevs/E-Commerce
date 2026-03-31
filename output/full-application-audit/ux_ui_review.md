# UX and UI review

## Storefront UX

- Clean layout rules in project (no emoji clutter, professional spacing). Verify dark and light contrast on checkout.
- Error pages under `/errors/[code]` give structured handling; ensure links back to shop work.

## Admin UX

- Dense dashboards; risk of alert fatigue if every API failure toasts.
- POS must optimize for touch and speed; failure messages must be short and audible or visible.

## Cross-surface consistency

- Terminology: "Order" vs "Sale" vs "Draft" should match Medusa lifecycle in both apps.
- Dates and time zones: show store timezone to operators.

## Information architecture

- Settings split: payments vs storefront public metadata vs preferences; good separation if labels are clear.

## Trust and clarity

- Do not show fake badges (reviews count from mock data, stock "99+" when unknown).

## Business-owner usability

- BYOK flows need copy that explains Medusa restart, webhook URLs, and PSP dashboard fields.

## Invisible system boundaries

- Customers do not know Medusa vs Supabase; errors should not leak internal service names in production.

## Error messaging quality

- Prefer actionable text: "Payment provider not configured" vs "Error 500".

## Empty, loading, failure states

- Loading skeletons should not look like "zero results" forever.
- Failed fetch should offer retry, not a blank grid.
