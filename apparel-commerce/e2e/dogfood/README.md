# Dogfood visual screenshots

- **Run:** from `apparel-commerce/`, `pnpm dogfood:screenshots`
- **Output:** `dogfood-output/screenshots/*.png` (full-page PNGs)
- **Storefront:** `visual-screenshots.spec.ts` covers public routes including PDP ` /shop/classic-shorts` (same slug as smoke tests).
- **Admin:** `admin-visual-screenshots.spec.ts` uses `http://localhost:3001`. Admin routes require Google OAuth; unauthenticated runs capture the **NextAuth sign-in** UI (not the dashboard). To capture the signed-in dashboard, add a Playwright `storageState` from a manual login and pass `--storage-state=...` (optional follow-up).

Playwright starts API (4000), storefront (3000), and admin (3001) unless `PLAYWRIGHT_SKIP_WEBSERVER` is set and those URLs already respond.
