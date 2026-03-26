# Vercel Deployment (Storefront)

## Required Environment Variables

Set these in Vercel → Project → Settings → Environment Variables. Without them, the storefront shows "Catalog service unavailable" or "Invalid URL".

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_MEDUSA_URL` | Medusa backend base URL (HTTPS in production) | `https://your-medusa.onrender.com` |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Medusa publishable API key | From `medusa seed:ph` output |
| `NEXT_PUBLIC_MEDUSA_REGION_ID` | Medusa region ID | From Medusa admin or seed |

Alternative: use `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_API_KEY`, `MEDUSA_REGION_ID` (server-side only).

Do not leave these empty. Empty values cause "Invalid URL" errors.

---

## Node.js Version

The project requires Node 20. Set in Vercel: **Settings → General → Node.js Version → 20.x**.  
The storefront has `engines.node: "20.x"` and `.nvmrc`; Vercel should pick 20.x. If builds still use Node 24, set it explicitly in the dashboard.

---

## Required Settings

### 1. Root Directory
```
apps/storefront
```
**Path:** Settings → General → Root Directory  
No leading or trailing spaces.

### 2. Include source files outside of the Root Directory
**Must be enabled** for monorepo workspace dependencies.  
**Path:** Settings → General → Root Directory → Edit → enable the option

Without this, Vercel cannot access parent `packages/` and the build may produce an incomplete output → 404.

### 3. Framework Preset
Set to **Next.js** (or leave auto-detect if it picks it up).  
**Path:** Settings → General → Framework Preset

---

## Build & Output

- **Install:** `cd ../.. && pnpm install` (from repo root for workspace)
- **Build:** `cd ../.. && pnpm exec turbo run build --filter=@apparel-commerce/storefront`
- **Output:** `.next` in `apps/storefront` (auto-detected for Next.js)
