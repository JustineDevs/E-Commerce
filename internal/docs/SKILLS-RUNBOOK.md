# Skills runbook (repo root `skills-lock.json`)

`skills-lock.json` pins skill packages by GitHub source and hash. This repo does not vendor `.agent/skills/*`; use the lock file as the registry of what the agent should load for a given task.

| Skill (lock key) | Typical use | Local run / artifact |
|------------------|------------|------------------------|
| `e2e-testing` | Playwright, POM, CI | `apparel-commerce/pnpm test:e2e` |
| `dogfood` | Exploratory QA, screenshots | `apparel-commerce/dogfood-output/report.md` + `agent-browser` |
| `design-with-taste` | UI feel, motion, one primary action | See checklist in dogfood report + storefront `globals.css` |
| `ui-ux-pro-max` | Favicon / touch-icon / manifest sizing | `apparel-commerce/apps/storefront/public/icons/*`, regenerate: `pnpm --filter @apparel-commerce/storefront generate:icons` (source: `apparel-commerce/public/Maharlika Logo Design (abstract).png`) |
| `building-with-medusa` | Medusa backend, workflows, modules | `apparel-commerce/apps/medusa`; program: `MEDUSA-MIGRATION-PROGRAM.md`; PH seed + import: `pnpm seed:ph`, `pnpm import:legacy-catalog`, `pnpm import:legacy-inventory` (from `apps/medusa`, see app `README.md`) |

Install or update locked skills with your org’s skill installer; verify hashes against `skills-lock.json` after updates.