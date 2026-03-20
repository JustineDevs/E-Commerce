# /repo-map

Current repository structure and reference. Use this to orient agents and contributors.

## Current structure

- **apparel-commerce/** – Monorepo root (Turborepo + pnpm)
  - **apps/** – Applications
    - `storefront/` – Next.js App Router. Public customer storefront (home, shop, PDP, cart, checkout, tracking, account).
    - `admin/` – Next.js App Router. Internal dashboard (analytics, inventory, orders, POS).
    - `api/` – Node.js + Express. Webhooks, background jobs, inventory services, order services, barcode lookup.

  - **packages/** – Shared packages
    - `ui/` – Shared UI components (Tailwind, shadcn/ui).
    - `types/` – Shared domain types (products, variants, orders, inventory).
    - `validation/` – Request and payload validation.
    - `database/` – Migrations, schema utilities, seed files (Supabase).
    - `config/` – TypeScript, ESLint, Tailwind configuration.
    - `sdk/` – Internal clients and service adapters (Lemon Squeezy, AfterShip).

- **internal/docs/** – Internal documentation
  - `spec.md` – Apparel Commerce Platform specification.
  - `blueprint.md` – Sprint plan and technical blueprint.
  - `privacy-terms.md` – PRD, service agreement, GDPR/PDPA compliance.

- **.cursor/** – Agent rules, commands, skills, LLM context
  - `commands/` – Cursor commands (audit, docs, hardening, QA, repo-map, trace, etc.).
  - `rules/` – Project rules and standards.
  - `llm/` – LLM context and indexed docs (Lemon Squeezy, AfterShip, etc.).

- **.github/** – Workflows, issue/PR templates (if present)

- **Root** – `package.json` (pnpm workspace), `pnpm-workspace.yaml`, `CODEOWNERS`, config files

## Reference

Canonical spec and blueprint: see **internal/docs/spec.md** and **internal/docs/blueprint.md** for system scope, tech stack, data model, OMS flow, and sprint plan.

## Ownership

Review and sign-off are defined in **CODEOWNERS** (people/roles). Path-based auto-review can be added there if needed (e.g. `apparel-commerce/apps/*`, `apparel-commerce/packages/*`, `.cursor/*`).
