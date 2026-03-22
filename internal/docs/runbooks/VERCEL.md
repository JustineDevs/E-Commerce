# Vercel Deployment (Storefront)

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
