# Biome Upgrade Report: 2.4.4 -> 2.4.8

**Date:** 2026-03-23
**Task:** Upgrade biome from 2.4.4 to the latest. What is the latest version, are there breaking changes for the project's biome.json, and any security issues?

---

## Executive Summary

- Latest version of `@biomejs/biome` is **2.4.8** (released March 18, 2026).
- Upgrade from 2.4.4 to 2.4.8 is **safe**: no breaking changes across all four patch releases (2.4.5, 2.4.6, 2.4.7, 2.4.8).
- Every config key in the project's `biome.json` remains valid in 2.4.8 — **no schema changes required**.
- **No security advisories** found for `@biomejs/biome`.
- Two files require updates: `biome.json` (schema URL) and `.pre-commit-config.yaml` (rev pin).

---

## Step 1: Inventory

### biome.json (current: 2.4.4)

| Key                                                       | Value                                           |
|-----------------------------------------------------------|-------------------------------------------------|
| `$schema`                                                 | `https://biomejs.dev/schemas/2.4.4/schema.json` |
| `vcs.enabled`                                             | `true`                                          |
| `vcs.clientKind`                                          | `"git"`                                         |
| `vcs.useIgnoreFile`                                       | `true`                                          |
| `files.ignoreUnknown`                                     | `true`                                          |
| `formatter.enabled`                                       | `true`                                          |
| `formatter.indentStyle`                                   | `"tab"`                                         |
| `linter.enabled`                                          | `true`                                          |
| `linter.rules.recommended`                                | `true`                                          |
| `linter.rules.complexity.noImportantStyles`               | `"off"`                                         |
| `javascript.formatter.quoteStyle`                         | `"double"`                                      |
| `css.parser.tailwindDirectives`                           | `true`                                          |
| `overrides[0].includes`                                   | `["**/*.vue"]`                                  |
| `overrides[0].linter.rules.correctness.noUnusedVariables` | `"off"`                                         |
| `overrides[0].linter.rules.correctness.noUnusedImports`   | `"off"`                                         |
| `assist.enabled`                                          | `true`                                          |
| `assist.actions.source.organizeImports`                   | `"on"`                                          |

### .pre-commit-config.yaml (current: v2.4.4)

| Hook                                 | Current rev |
|--------------------------------------|-------------|
| `biomejs/pre-commit` → `biome-check` | `v2.4.4`    |

---

## Step 2: Version Verification

| Source                                                    | Result                                            |
|-----------------------------------------------------------|---------------------------------------------------|
| `api.github.com/repos/biomejs/biome/releases/latest`      | `@biomejs/biome@2.4.8` — March 18, 2026           |
| `api.github.com/repos/biomejs/pre-commit/releases/latest` | **v0.6.1** (Dec 17, 2024) — **stale, do not use** |
| `api.github.com/repos/biomejs/pre-commit/tags`            | `v2.4.8` is the latest tag                        |
| `registry.npmjs.org/@biomejs/biome/latest`                | `2.4.8`                                           |

**Note on tags vs releases divergence:** The `biomejs/pre-commit` repo's `/releases/latest` endpoint returns stale `v0.6.1` from December 2024. The `/tags` endpoint is authoritative and shows `v2.4.8` as current. Any tooling that reads only `/releases/latest` for this repo will silently pin to a 3-month-old version. Always use tags for `biomejs/pre-commit`.

---

## Findings

### biome (npm package): 2.4.4 -> 2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/biome/releases/latest` (March 23, 2026) + `registry.npmjs.org/@biomejs/biome/latest`
**What changed:** Four patch releases (2.4.5 through 2.4.8), all bug fixes and additive improvements:

- **2.4.5:** New nursery lint rules (opt-in, not enabled by default): `useVueScopedStyles`, `useNullishCoalescing`, `noVueRefAsOperand`, `useNamedCaptureGroup`, `useArraySome`, `useUnicodeRegex`. Bug fixes for Vue `<script setup>`, Svelte comments-in-tags, CSS formatter BOM handling, GitHub Actions color output in `biome ci`.
- **2.4.6:** `noUnreachable` fix for `finally` blocks; formatter stability for `case` clauses with trailing comments; LSP `configurationPath` resolution fix; performance improvements for `noImportCycles` and `noEmptyBlockStatements`.
- **2.4.7:** New nursery rules (opt-in): `useBaseline`, `useImportsFirst`, `noTopLevelLiterals`, `noEmptyObjectKeys`. SCSS at-rule support expansion. `domains` field auto-detection. Performance for projects over 2K files.
- **2.4.8:** LSP crash fix (could corrupt files during format-on-save). Fixed `.gitignore` resolution relative to `vcs.root`. Fixed TypeScript arrow function formatting after `=>` comments. Fixed `---` in HTML element content. Fixed false "changed" reports for Svelte/Vue with `indentScriptAndStyle` enabled. Two new Drizzle ORM nursery rules (opt-in).

**Breaking changes:** None across 2.4.5, 2.4.6, 2.4.7, 2.4.8.
**Config schema impact for this project's biome.json:** None. All existing keys remain valid in 2.4.8. Verified against `biomejs.dev/schemas/2.4.8/schema.json`:

- `css.parser.tailwindDirectives` — valid (introduced in v2.3.0, active in 2.4.8)
- `assist.actions.source.organizeImports` — valid (confirmed via official docs at `biomejs.dev/assist/actions/organize-imports/`)
- `linter.rules.complexity.noImportantStyles` — valid (active rule, not deprecated)
- `vcs.useIgnoreFile` — valid
- All other keys — valid

**Migration steps:**

1. Update `biome.json` `$schema` URL: `https://biomejs.dev/schemas/2.4.4/schema.json` -> `https://biomejs.dev/schemas/2.4.8/schema.json`
2. Update `.pre-commit-config.yaml` rev: `v2.4.4` -> `v2.4.8`
3. If `@biomejs/biome` is in `package.json` (not present in this repo's config files, but apply if it is), bump to `^2.4.8` or `2.4.8`.
4. No other changes needed.

**Security advisories:** None found via WebSearch "biomejs biome CVE security advisory 2025 2026" and GitHub Advisory Database search. One advisory (GHSA-hr3g-62w3-g764 / CVE-2026-3680) appeared in results but is for an unrelated third-party package "RyuzakiShinji biome-mcp-server" — not `@biomejs/biome`.
**Recommendation:** Upgrade. Zero risk, picks up LSP stability fix (format-on-save file corruption in 2.4.8 is the most impactful fix for day-to-day use), Svelte/Vue false-positive fixes, and `.gitignore` resolution fix for `vcs.root`.
**Your call:** Straightforward version bump. No decision complexity.

---

### biomejs/pre-commit hook: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags` (March 23, 2026). Note: `/releases/latest` returns stale v0.6.1 — tags are the authoritative source for this repo.
**What changed:** 4 patch bumps tracking `@biomejs/biome`. Same fixes as the npm package above.
**Breaking changes:** No
**Migration steps:** In `.pre-commit-config.yaml`, update `rev: v2.4.4` to `rev: v2.4.8` under the `biomejs/pre-commit` repo entry.
**Security advisories:** None found (same search as above covers both).
**Recommendation:** Update alongside the npm package bump. Zero risk.
**Your call:** Include in this batch.

---

## Concrete Changes Required

### biome.json

Change line 2:

```json
"$schema": "https://biomejs.dev/schemas/2.4.4/schema.json",
```

to:

```json
"$schema": "https://biomejs.dev/schemas/2.4.8/schema.json",
```

No other changes to `biome.json` are needed.

### .pre-commit-config.yaml

Change line 49:

```yaml
  - repo: https://github.com/biomejs/pre-commit
    rev: v2.4.4
```

to:

```yaml
  - repo: https://github.com/biomejs/pre-commit
    rev: v2.4.8
```

---

## Verification Log

| Claim                                                | Tool                 | Source                                                             | Finding                                                                                                                                                                                      |
|------------------------------------------------------|----------------------|--------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Latest `@biomejs/biome` release                      | WebFetch             | `api.github.com/repos/biomejs/biome/releases/latest`               | `@biomejs/biome@2.4.8`, March 18, 2026                                                                                                                                                       |
| Latest `@biomejs/biome` tags                         | WebFetch             | `api.github.com/repos/biomejs/biome/tags`                          | Top tags include `lsp-intellij/v0.0.7` and older lsp/* tags — not the relevant series; biome CLI uses `@biomejs/biome@X.Y.Z` tag format on the biome repo, release API is authoritative here |
| Latest `biomejs/pre-commit` release                  | WebFetch             | `api.github.com/repos/biomejs/pre-commit/releases/latest`          | Stale: `v0.6.1` (Dec 17, 2024) — do not use this endpoint                                                                                                                                    |
| Latest `biomejs/pre-commit` tags                     | WebFetch             | `api.github.com/repos/biomejs/pre-commit/tags`                     | `v2.4.8` is the latest tag                                                                                                                                                                   |
| npm registry version                                 | WebFetch             | `registry.npmjs.org/@biomejs/biome/latest`                         | `2.4.8`                                                                                                                                                                                      |
| 2.4.5 breaking changes                               | WebFetch             | `github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.5` | None — backward-compatible additions and fixes only                                                                                                                                          |
| 2.4.6 breaking changes                               | WebFetch             | `github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.6` | None                                                                                                                                                                                         |
| 2.4.7 breaking changes                               | WebFetch             | `github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.7` | None                                                                                                                                                                                         |
| 2.4.8 breaking changes                               | WebFetch             | `github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.8` | None                                                                                                                                                                                         |
| Full changelog 2.4.0 to latest                       | WebFetch             | `biomejs.dev/internals/changelog/version/2-4-0...latest/`          | No schema key removals or renames; only additive new options                                                                                                                                 |
| `css.parser.tailwindDirectives` validity in 2.4.8    | WebFetch             | `biomejs.dev/schemas/2.4.8/schema.json`                            | Valid — present in schema                                                                                                                                                                    |
| `assist.actions.source.organizeImports` validity     | WebSearch + WebFetch | `biomejs.dev/assist/actions/organize-imports/`                     | Valid — confirmed as correct config path in Biome v2+                                                                                                                                        |
| `linter.rules.complexity.noImportantStyles` validity | WebSearch            | `biomejs.dev/linter/rules/no-important-styles/`                    | Active rule, not deprecated or renamed                                                                                                                                                       |
| `vcs.useIgnoreFile` validity                         | WebFetch             | `biomejs.dev/reference/configuration/`                             | Valid — documented under vcs section                                                                                                                                                         |
| Security advisories for biomejs/biome                | WebSearch            | "biomejs biome CVE security advisory 2025 2026"                    | No CVEs or advisories found for `@biomejs/biome`                                                                                                                                             |
| GitHub Advisory Database                             | WebFetch             | `github.com/advisories?query=biome`                                | One result (GHSA-hr3g-62w3-g764) is for unrelated third-party "biome-mcp-server" package, not `@biomejs/biome`                                                                               |

### Self-check

- Every version sourced from a live lookup: Yes
- Both releases AND tags checked for `biomejs/pre-commit`: Yes — divergence confirmed and documented
- Every dependency covered by a security search: Yes — one search covers both `@biomejs/biome` (npm) and `biomejs/pre-commit` (pre-commit hook) as they share the same codebase
- Changelogs read for every upgrade: Yes — individual release pages for 2.4.5, 2.4.6, 2.4.7, 2.4.8 plus the full 2.4.0+ changelog page
- SHA pinning: Not applicable — `biomejs/pre-commit` is a pre-commit hook rev, not a GitHub Actions reference. The `.pre-commit-config.yaml` has no GitHub Actions entries for biome.
- Internal consistency: `biome.json` schema URL and `.pre-commit-config.yaml` rev both reference 2.4.4 — consistent with each other, both need updating to 2.4.8
- False contemporaneity claims: None detected in the project files. The files pin to 2.4.4 without claiming it is "current" or "latest".
