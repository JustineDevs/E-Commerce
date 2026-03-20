# /docs

**Strict scope:** When answering documentation questions or loading doc context, read **only** from these roots. All files and directories under them are the canonical doc set.

---

## 1. `.cursor/llm` (all files and directories)

LLM context and indexed project/docs. Read everything under `.cursor/llm/`.

### Root
- `llm.txt` – Project/LLM context index
- `README.md` – LLM context overview (if present)

### `.cursor/llm/*` (all files)
- `AfterShip-Tracking-API-AfterShip-Docs-*.txt`
- `Guides-Guides-and-Tutorials-•-Lemon-Squeezy.txt`
- Any other `.txt` files in this directory

---

## 2. `internal/docs` (all files and directories)

Internal spec, blueprint, and implementation docs. Read everything under `internal/docs/`.

### `internal/docs/`
- `spec.md` – Apparel Commerce Platform specification
- `blueprint.md` – Sprint plan and technical blueprint
- `privacy-terms.md` – PRD, service agreement, GDPR/PDPA compliance

---

## Rule

For any request that needs documentation or context: **strictly read from `.cursor/llm` and `internal/docs`** (all files and directories listed above). Do not treat other `docs/` or `docs/*` paths as authoritative unless they are linked from or duplicated under these two roots. When in doubt, prefer `internal/docs/spec.md` and `internal/docs/blueprint.md` as entry points.
