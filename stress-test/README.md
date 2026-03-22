# Stress / E2E testing

All Playwright-related tests, reports, and artifacts live under this directory.

## Structure

```
stress-test/
├── e2e/                    # Test specs (smoke, flows, dogfood)
├── test-results/            # Playwright test artifacts (traces, screenshots)
├── playwright-report/       # HTML test report
├── dogfood-output/         # Dogfood screenshot outputs
├── .playwright-cache/       # Transform cache & temp (EPERM workaround)
└── README.md
```

## Commands

From project root:

### Full stress-test (all phases)

- `pnpm stress-test` — Lint → Security → Audit → Unit/Medusa → E2E → Dogfood
- `pnpm stress-test:quick` — Same but skips E2E and dogfood (no dev servers needed)

### Individual phases

- `pnpm test:e2e` — Run all E2E tests (headless)
- `pnpm test:e2e:ui` — Run Playwright UI mode
- `pnpm test:e2e:report` — Open last HTML report
- `pnpm dogfood:screenshots` — Capture full-page screenshots (storefront + admin)

### Manual checklist

See `stress-test/checklist.md` for design-with-taste, core-engineering, OWASP review items.

## Output locations

| Output            | Path                               |
|-------------------|------------------------------------|
| Test results      | `stress-test/test-results/`         |
| HTML report       | `stress-test/playwright-report/`    |
| Dogfood screenshots | `stress-test/dogfood-output/screenshots/` |
