# Biome Upgrade Analysis: 2.4.4 -> 2.4.8

## biomejs/biome: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** GitHub API (`api.github.com/repos/biomejs/biome/releases/latest`), npm registry, biomejs/pre-commit tags endpoint
**Latest version confirmed:** 2.4.8 (released 2026-03-18)

**What changed:** 4 patch bumps tracking @biomejs/biome. Bug fixes including an LSP crash that could corrupt file content during format-on-save. New nursery lint rules (opt-in, not enabled by default). Bug fixes for Vue/Svelte/Astro.

**Breaking changes:** No. Every key in your current `biome.json` is valid in 2.4.8:

- `complexity.noImportantStyles: "off"` — rule still exists and is still under the `complexity` group
- `css.parser.tailwindDirectives: true` — still valid
- `assist.actions.source.organizeImports: "on"` — still valid
- `overrides` with `includes` — still valid (your config already uses the v2 format)
- All other keys (`vcs`, `files`, `formatter`, `linter`, `javascript`) — unchanged

**Migration steps:**

1. `biome.json`: Change `$schema` from `https://biomejs.dev/schemas/2.4.4/schema.json` to `https://biomejs.dev/schemas/2.4.8/schema.json`
2. `.pre-commit-config.yaml`: Change `rev: v2.4.4` to `rev: v2.4.8` in the `biomejs/pre-commit` repo entry
No `biome migrate` command needed. That is only for major version upgrades.

**Security advisories:** None found via WebSearch "biomejs biome CVE security advisory 2025 2026". GitHub Advisory Database (`github.com/advisories?query=biomejs`) returned zero results.

**Recommendation:** Update. Zero risk, picks up bug fixes. The LSP crash fix is a meaningful quality-of-life improvement if your team uses editor integration with format-on-save.

**Your call:** Include in this batch or defer?

## Verification Note

`biomejs/pre-commit` `/releases/latest` returns stale v0.6.1 (Dec 2024). The actual latest is v2.4.8 confirmed via `/tags`. This repo uses tags-only versioning — always check tags, not releases.
