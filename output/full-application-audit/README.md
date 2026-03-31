# Full application audit (archived notes)

These Markdown files are a **point-in-time static audit** (architecture, risks, and recommendations). They are **not** a live checklist.

**How to use them**

- Treat each register (`gap_register.md`, `weakness_register.md`, etc.) as historical context.
- **Open items** stay open until you close them in code, tests, or CI. Some gaps (full PSP E2E, uniform admin JSON errors) are intentionally broad.
- **Codebase changes after the export** are not reflected automatically. Compare claims against the repo when in doubt.

**Last reconciled:** 2026-03-31 (examples: in-app catalog matrix and chat-order intake evolved, audit log explorer uses plain-language labels, payment connections align `ProviderSecrets` with `@apparel-commerce/types` including Maya).

**Security / BYOK follow-up (code):** See root `docs/security-program.md` for production BYOK mandate (`validate-process-env`), admin API guard script, and CI wiring.

Do not delete these files only because they are old; delete or merge if you replace the process with another system of record (e.g. issue tracker export).
