# Biome Upgrade Report: 2.4.4 -> 2.4.8

**Date:** 2026-03-23
**Project files examined:**

- `/Volumes/extreme/Projects/Work/DocumentationOnlyProjects/branching-strategy-redesign-upp/biome.json`
- `/Volumes/extreme/Projects/Work/DocumentationOnlyProjects/branching-strategy-redesign-upp/.pre-commit-config.yaml`

---

## Step 1: Inventory

| Location                  | Dependency           | Current Version |
|---------------------------|----------------------|-----------------|
| `biome.json` (`$schema`)  | `@biomejs/biome`     | `2.4.4`         |
| `.pre-commit-config.yaml` | `biomejs/pre-commit` | `v2.4.4`        |

**Config keys in use (relevant for breaking-change analysis):**

- `vcs.enabled`, `vcs.clientKind`, `vcs.useIgnoreFile`
- `files.ignoreUnknown`
- `formatter.enabled`, `formatter.indentStyle: tab`
- `linter.enabled`, `linter.rules.recommended: true`
- `linter.rules.complexity.noImportantStyles: off`
- `javascript.formatter.quoteStyle: double`
- `css.parser.tailwindDirectives: true`
- `overrides[].includes` (Vue files), `linter.rules.correctness.noUnusedVariables/noUnusedImports: off`
- `assist.enabled`, `assist.actions.source.organizeImports: on`

---

## Step 2: Latest Version Confirmed

**Latest release of `@biomejs/biome`:** `2.4.8` (published March 18, 2026)
**Latest tag on `biomejs/pre-commit`:** `v2.4.8`

Verified via:

- `api.github.com/repos/biomejs/biome/releases/latest` -> `@biomejs/biome@2.4.8`
- `api.github.com/repos/biomejs/pre-commit/tags` -> `v2.4.8` is the top tag

Note: The biomejs/biome `/tags` endpoint returns LSP and JS API sub-project tags, not the main biome package tags. The pre-commit repo tags are the canonical source for the pre-commit hook version; they track biome releases 1:1.

---

## Decisions by Risk Level

### SECURITY

No security advisories or CVEs exist for `@biomejs/biome`.

- GitHub Security Advisories page for `biomejs/biome` explicitly states: "There aren't any published security advisories."
- WebSearch for "biomejs biome CVE security advisory" returned no biome-specific CVEs.
- Socket.dev page returned no content (tool limitation); checked via GitHub security page directly.

**Verified via:** WebFetch of `https://github.com/biomejs/biome/security/advisories`; WebSearch "biomejs biome security advisory CVE vulnerability"

---

### ROUTINE

---

### biome.json $schema + @biomejs/biome: 2.4.4 -> 2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch of `api.github.com/repos/biomejs/biome/releases/latest` (v2.4.8, March 18 2026); WebFetch of changelog pages for v2.4.5, v2.4.6, v2.4.7, v2.4.8 at `biomejs.dev/internals/changelog/version/2-4-{5,6,7,8}/`
**What changed:** Four patch releases, all bug fixes and new nursery rules:

- **2.4.5** (March 2, 2026): Bug fixes for `useOptionalChain`, `noUnreachable`, HTML formatter trailing comments in switch, CSS SCSS binary expressions, LSP config path resolution. New nursery rules added: `useVueScopedStyles`, `noVueRefAsOperand`, etc. None promoted to recommended.
- **2.4.6** (March 5, 2026): Performance improvements for `noImportCycles` (excludes node_modules) and `noEmptyBlockStatements`. False-positive fixes for `noUnreachable` in finally blocks, JSX element detection in Astro/Vue/Svelte, CSS hex escape handling. No recommended-ruleset changes.
- **2.4.7** (March 13, 2026): New nursery rules `useBaseline` (CSS), `useImportsFirst`, `noTopLevelLiterals`, `noEmptyObjectKeys`. SCSS at-rule parsing expanded. `noShadow` improvements. No promoted-to-recommended changes.
- **2.4.8** (March 18, 2026): New nursery rules `noDrizzleUpdateWithoutWhere` and `noDrizzleDeleteWithoutWhere`. LSP crash fix (format-on-save). TypeScript arrow function formatting fix. HTML parser `---` fix. No promoted-to-recommended changes.

**Breaking changes:** No. All four releases are patch versions with no documented breaking changes. No rules were promoted from nursery to `recommended` across any of these releases (which would otherwise trigger new lint errors given `"recommended": true` in this project's config).
**Config compatibility for YOUR biome.json:**

- `complexity.noImportantStyles` is stable (promoted from nursery in 2.2.0) — the `off` override remains valid.
- `css.parser.tailwindDirectives` — no changes to this option in 2.4.5-2.4.8 (a related CSS fix in 2.4.5 for `@utility` names with `/` is a bug fix, not a breaking change).
- `assist.actions.source.organizeImports: on` — no changes documented.
- All other config keys (`vcs`, `files.ignoreUnknown`, `formatter`, `javascript.formatter`, `overrides`) — no schema changes documented.
- `$schema` URL should be updated from `https://biomejs.dev/schemas/2.4.4/schema.json` to `https://biomejs.dev/schemas/2.4.8/schema.json` to match the runtime version.

**Migration steps:**

1. Update `biome.json` `$schema` field: `"$schema": "https://biomejs.dev/schemas/2.4.8/schema.json"`
2. Update `.pre-commit-config.yaml` biomejs/pre-commit `rev: v2.4.4` -> `rev: v2.4.8`
3. Update your package manager lockfile / dev dependency if `@biomejs/biome` is installed directly: bump to `2.4.8`.
4. No config key changes needed — all existing keys remain valid.

**Security advisories:** None found. Searched: "biomejs biome CVE security advisory vulnerability"; GitHub security advisories page checked directly.
**Recommendation:** Upgrade. This is a pure patch-version bump across four releases. All changes are bug fixes (many of which benefit this project directly — Vue SFC improvements, LSP crash fix, TypeScript formatting fixes). No config changes required beyond the schema URL and pre-commit rev. Zero risk.
**Your call:** Bump `biome.json` `$schema` to `2.4.8`, bump `.pre-commit-config.yaml` `rev` to `v2.4.8`, and bump the npm/package manager dev dependency. No other changes needed.

---

### biomejs/pre-commit hook: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch of `api.github.com/repos/biomejs/pre-commit/tags` — `v2.4.8` is the top tag; the pre-commit hook tracks biome releases 1:1.
**What changed:** The pre-commit hook version mirrors the biome tool version. Upgrading to `v2.4.8` picks up the same bug fixes documented above.
**Breaking changes:** No. The hook runs `biome check`; the interface is unchanged.
**Migration steps:** Change `rev: v2.4.4` to `rev: v2.4.8` in `.pre-commit-config.yaml`. Then run `pre-commit autoupdate` or update manually.
**Security advisories:** None found (same search as above; the pre-commit hook is a thin wrapper around the biome binary).
**Recommendation:** Update alongside the biome version bump. Keep both in sync.
**Your call:** Update `.pre-commit-config.yaml` `rev` field to `v2.4.8`.

---

## Notable Fixes Relevant to This Project

Given the config in `biome.json`, the following fixes from 2.4.5-2.4.8 are directly relevant:

- **Vue SFC improvements (2.4.5, 2.4.6):** `noVueDuplicateKeys` false positives for `toRefs(props)` fixed; JSX element detection in Vue templates fixed; `noUnusedImports`/`useImportType` false positives in Vue fixed. This project has Vue-file overrides in `biome.json`, so these fixes will reduce noise.
- **LSP crash fix (2.4.8):** Format-on-save could corrupt file content — fixed. If developers use the Biome VSCode extension or another LSP client, this is a notable stability improvement.
- **`noImportCycles` performance (2.4.6):** Now explicitly excludes `node_modules`, which improves lint speed on large projects.
- **Tailwind CSS `@utility` parsing (2.4.5):** The project uses `tailwindDirectives: true`; this fix resolves parse errors on `@utility` names containing `/`.

---

## Verification Log

| Claim                                                    | Tool      | Source                                                                             | Finding                                                                             |
|----------------------------------------------------------|-----------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| Latest biome release is 2.4.8                            | WebFetch  | `https://api.github.com/repos/biomejs/biome/releases/latest`                       | Tag `@biomejs/biome@2.4.8`, published March 18, 2026                                |
| biomejs/biome tags list                                  | WebFetch  | `https://api.github.com/repos/biomejs/biome/tags`                                  | Top results are LSP sub-project tags; not the main package version tags             |
| biomejs/pre-commit latest tag                            | WebFetch  | `https://api.github.com/repos/biomejs/pre-commit/tags`                             | `v2.4.8` is top tag; full 2.4.x series present                                      |
| No security advisories for biome                         | WebFetch  | `https://github.com/biomejs/biome/security/advisories`                             | "There aren't any published security advisories."                                   |
| No biome-specific CVEs                                   | WebSearch | Query: "biomejs biome security advisory CVE vulnerability"                         | No biome CVEs found; unrelated ecosystem CVEs only                                  |
| No biome CVEs (broader search)                           | WebSearch | Query: "biome CVE security advisory 2025 2026"                                     | No biome CVEs found                                                                 |
| 2.4.5-2.4.8 release notes                                | WebFetch  | `https://api.github.com/repos/biomejs/biome/releases`                              | Four patch releases; bug fixes only; no breaking changes                            |
| 2.4.5 changelog (no breaking changes, no promoted rules) | WebFetch  | `https://biomejs.dev/internals/changelog/version/2-4-5/`                           | Bug fixes; new nursery rules only; no promotions to recommended                     |
| 2.4.6 changelog (no breaking changes, no promoted rules) | WebFetch  | `https://biomejs.dev/internals/changelog/version/2-4-6/`                           | Bug fixes and perf improvements; no ruleset promotions                              |
| 2.4.7 changelog (no breaking changes, no promoted rules) | WebFetch  | `https://biomejs.dev/internals/changelog/version/2-4-7/`                           | New nursery rules; no promotions to recommended                                     |
| 2.4.8 changelog (no breaking changes, no promoted rules) | WebFetch  | `https://biomejs.dev/internals/changelog/version/2-4-8/`                           | New nursery rules; LSP crash fix; no promotions to recommended                      |
| `noImportantStyles` rule status                          | WebSearch | Query: "biome noImportantStyles complexity rule changelog deprecated removed 2025" | Promoted from nursery to stable `complexity` group in 2.2.0; not deprecated/removed |
| Biome v2 migration guide (config schema)                 | WebFetch  | `https://biomejs.dev/blog/biome-v2/`                                               | Project is already on v2.4.4 (v2.x); no v1->v2 migration needed                     |

---

## Self-Check

- Every version sourced from a live lookup? **Yes** — releases/latest and pre-commit/tags both fetched.
- Both releases AND tags checked? **Yes** — `/releases/latest` confirmed 2.4.8; `/tags` for pre-commit repo confirmed 2.4.8.
- Every dependency covered by security search? **Yes** — GitHub advisories page fetched directly; two separate WebSearches conducted. No CVEs found.
- Changelogs read for every upgrade? **Yes** — individual changelog pages for v2.4.5, v2.4.6, v2.4.7, v2.4.8 fetched and reviewed.
- SHA pinning for GitHub Actions? **Not applicable** — this task covers biome.json and .pre-commit-config.yaml, not GitHub Actions workflows.
- Internal consistency: `biome.json` schema version and `.pre-commit-config.yaml` hook version both reference `2.4.4` and should both move to `2.4.8` together.

---

## Summary

| Item                                         | Current  | Latest   | Action Required            |
|----------------------------------------------|----------|----------|----------------------------|
| `biome.json` `$schema`                       | `2.4.4`  | `2.4.8`  | Update URL                 |
| `.pre-commit-config.yaml` biomejs/pre-commit | `v2.4.4` | `v2.4.8` | Update `rev`               |
| `@biomejs/biome` npm package                 | `2.4.4`  | `2.4.8`  | Bump dev dependency        |
| Security advisories                          | —        | —        | None found                 |
| Config breaking changes                      | —        | —        | None; all keys valid as-is |
| Rules promoted to recommended                | —        | —        | None across 2.4.5-2.4.8    |
