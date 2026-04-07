# apparel-commerce-commit CLI

Composable CLI for git commits with security checks in the **Apparel Commerce** monorepo. Uses async-first composable commands and optional Linear CLI integration.

## Commands

- **commit** (default) — Parallel commit with security checks
- **security** — Scan for sensitive files only
- **linear** — Print Linear issue trailer (requires `linear` CLI on PATH)

## Usage

```bash
# From repo root
node scripts/commit/cli/index.js [command] [options]

# Or via pnpm
pnpm run commit          # commit (default)
pnpm run commit:dry      # commit --dry-run
pnpm run commit:cli      # show usage
```

## Options (commit)

- `--dry-run` — Preview without committing
- `--no-security-check` — Disable security checks (not recommended)
- `--warn-only` — Warn on sensitive files, do not fail
- `--max <n>` — Files per batch (default: 1; see inline help)

## Linear integration

When the `linear` CLI is installed, use `linear issue id` to resolve the current issue from the branch name (for example `feature/ENG-123`). Append the output to commit messages for traceability.

```bash
node scripts/commit/cli/index.js linear
```

## NO_COLOR

Respects `NO_COLOR` for CI and accessibility.
