# Biome Upgrade Report: 2.4.4 -> 2.4.8

**Task:** Upgrade biome from 2.4.4 to the latest version. Identify the latest version, breaking changes for the project's biome.json config, and any security issues.

**Date:** 2026-03-23

---

## Step 1: Inventory

### biome.json (current version: 2.4.4)

Config keys in use:

- `$schema`: `https://biomejs.dev/schemas/2.4.4/schema.json`
- `vcs.enabled`, `vcs.clientKind`, `vcs.useIgnoreFile`
- `files.ignoreUnknown`
- `formatter.enabled`, `formatter.indentStyle`
- `linter.enabled`, `linter.rules.recommended`, `linter.rules.complexity.noImportantStyles`
- `javascript.formatter.quoteStyle`
- `css.parser.tailwindDirectives`
- `overrides[].includes`, `overrides[].linter.rules.correctness.noUnusedVariables`, `overrides[].linter.rules.correctness.noUnusedImports`
- `assist.enabled`, `assist.actions.source.organizeImports`

### .pre-commit-config.yaml (current biome hook version: v2.4.4)

```yaml
- repo: https://github.com/biomejs/pre-commit
  rev: v2.4.4
  hooks:
    - id: biome-check
```

---

## Step 2: Current State Verification

### biomejs/biome (core tool)

- **Current project version:** 2.4.4 (schema pinned)
- **Latest release:** `@biomejs/biome@2.4.8`, published March 18, 2026
    - Verified via: WebFetch `https://api.github.com/repos/biomejs/biome/releases/latest`
- **Tags checked:** Confirmed 2.4.8 is the highest tag
    - Verified via: WebFetch `https://api.github.com/repos/biomejs/biome/releases?per_page=10`

### biomejs/pre-commit (pre-commit hook repo)

- **Current project version:** v2.4.4
- **`/releases/latest` returns:** v0.6.1 (December 17, 2024) -- STALE, not authoritative
- **`/tags` shows latest:** v2.4.8
    - Verified via: WebFetch `https://api.github.com/repos/biomejs/pre-commit/tags`
- **Note:** This is the documented tags-vs-releases divergence for this repo. The tags are authoritative.

---

## Step 3 & 4: Delta Assessment and Decisions

### biome ($schema + pre-commit rev): v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `https://api.github.com/repos/biomejs/biome/releases/latest` (March 18, 2026) and `https://api.github.com/repos/biomejs/biome/releases?per_page=10`

**What changed (versions 2.4.5 through 2.4.8, relevant to this project's config):**

- **v2.4.5:** New nursery rules added (opt-in, not enabled by default): `useVueScopedStyles`, `useNullishCoalescing`, `noVueRefAsOperand`, `useNamedCaptureGroup`, `useUnicodeRegex`, `useArraySome`. No changes to existing config keys.
- **v2.4.6:** Bug fixes to `noUnreachable`, `useAnchorContent`, `noEmptyBlockStatements` (performance), `noImportCycles` (performance). `useSortedAttributes` code action improvement. No config key changes.
- **v2.4.7:** `css.parser.tailwindDirectives` -- fixed parsing of `@utility` names containing forward slashes. This is a bug fix that benefits the project. Auto-domain detection from `package.json` added (opt-in behavior, no action required). `organizeImports` action now sorts named specifiers in bare exports and merges multiple bare exports. No config key changes.
- **v2.4.8:** New nursery rules for Drizzle ORM (`noDrizzleDeleteWithoutWhere`, `noDrizzleUpdateWithoutWhere`). CSS modern property support additions. LSP crash fix. TypeScript arrow function formatting fix. No config key changes.

**Breaking changes for THIS project's biome.json:**

The following config keys were audited against all changes in 2.4.5-2.4.8:

| Key                                         | Breaking change?                    | Notes                                                                                                                                                               |
|---------------------------------------------|-------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$schema`                                   | Manual update required              | URL must change from .../2.4.4/schema.json to .../2.4.8/schema.json. Not a behavioral breaking change -- a required metadata update for accurate schema validation. |
| `vcs.*`                                     | No                                  | Unchanged                                                                                                                                                           |
| `files.ignoreUnknown`                       | No                                  | Unchanged                                                                                                                                                           |
| `formatter.*`                               | No                                  | Unchanged                                                                                                                                                           |
| `linter.rules.recommended`                  | No                                  | No rules were promoted from nursery or moved to recommended in 2.4.5-2.4.8                                                                                          |
| `linter.rules.complexity.noImportantStyles` | No                                  | Rule still exists under `lint/complexity` -- confirmed via search and docs                                                                                          |
| `javascript.formatter.quoteStyle`           | No                                  | Unchanged                                                                                                                                                           |
| `css.parser.tailwindDirectives`             | No (bug fix)                        | `@utility` forward-slash parsing fixed in v2.4.7 -- a net improvement                                                                                               |
| `overrides[].correctness.noUnusedVariables` | No                                  | Unchanged                                                                                                                                                           |
| `overrides[].correctness.noUnusedImports`   | No                                  | Unchanged                                                                                                                                                           |
| `assist.actions.source.organizeImports`     | No behavior change; action enhanced | v2.4.7 improves bare export sorting/merging. Existing `"on"` setting still valid.                                                                                   |

**No breaking changes for this project's configuration.**

**Migration steps:**

1. Update `biome.json` line 2:

   ```json
   "$schema": "https://biomejs.dev/schemas/2.4.8/schema.json"
   ```

2. Update `.pre-commit-config.yaml` line 49:

   ```yaml
   rev: v2.4.8
   ```

3. That is all. No other changes to `biome.json` are required.

**Security advisories:** None found.

- WebSearch "biomejs biome CVE security advisory 2025 2026" -- no CVEs found for biomejs/biome.
- WebSearch "biomejs biome security vulnerability supply chain 2025 2026" -- no vulnerabilities found specific to Biome.
- GitHub Advisory Database query for "biomejs" -- 0 advisories returned.

**Recommendation:** Upgrade. This is a 4-patch bump with zero configuration impact beyond the `$schema` URL. The v2.4.7 fix for `css.parser.tailwindDirectives` (`@utility` forward-slash names) is directly relevant since the project uses `tailwindDirectives: true`. No new rules are forced on; new nursery rules are opt-in only.

**Your call:** Include in the next batch. No reason to defer. Two-line change total.

---

## Step 5: Priority Summary

| Priority | Dependency                                          | Current | Latest | Action            |
|----------|-----------------------------------------------------|---------|--------|-------------------|
| ROUTINE  | biome ($schema in biome.json)                       | 2.4.4   | 2.4.8  | Update schema URL |
| ROUTINE  | biomejs/pre-commit (rev in .pre-commit-config.yaml) | v2.4.4  | v2.4.8 | Version bump      |

No SECURITY, DEPRECATION, or BREAKING-UPGRADE items found.

---

## Step 6: Verification Log

| Claim                                             | Tool      | Source                                                                     | Finding                                                                                                   |
|---------------------------------------------------|-----------|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Latest biome release is 2.4.8                     | WebFetch  | `https://api.github.com/repos/biomejs/biome/releases/latest`               | `@biomejs/biome@2.4.8`, published March 18, 2026                                                          |
| biome 2.4.8 confirmed as latest (not just a tag)  | WebFetch  | `https://api.github.com/repos/biomejs/biome/releases?per_page=10`          | 2.4.8, 2.4.7, 2.4.6, 2.4.5 confirmed as the four most recent releases                                     |
| biomejs/biome tags list                           | WebFetch  | `https://api.github.com/repos/biomejs/biome/tags`                          | Returned lsp-intellij tags (different namespace); core biome tags confirmed via releases endpoint instead |
| biomejs/pre-commit /releases/latest               | WebFetch  | `https://api.github.com/repos/biomejs/pre-commit/releases/latest`          | Returns v0.6.1 (Dec 2024) -- stale, not authoritative                                                     |
| biomejs/pre-commit /tags                          | WebFetch  | `https://api.github.com/repos/biomejs/pre-commit/tags`                     | v2.4.8 is the latest tag                                                                                  |
| No breaking changes in v2.4.5                     | WebFetch  | `https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.5` | Confirmed no breaking changes                                                                             |
| No breaking changes in v2.4.6                     | WebFetch  | `https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.6` | Confirmed no breaking changes                                                                             |
| No breaking changes in v2.4.7                     | WebFetch  | `https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.7` | Confirmed no breaking changes; tailwindDirectives bug fix noted                                           |
| No breaking changes in v2.4.8                     | WebFetch  | `https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.4.8` | Confirmed no breaking changes                                                                             |
| 2.4.x changelog 2.4.4+                            | WebFetch  | `https://biomejs.dev/internals/changelog/version/2-4-0...latest/`          | Confirmed patch-level changes; no config key renames or removals                                          |
| `noImportantStyles` still exists under complexity | WebSearch | "biome noImportantStyles complexity rule removed renamed 2025 2026"        | Rule confirmed present in current docs at `lint/complexity/noImportantStyles`                             |
| No CVEs for biome                                 | WebSearch | "biomejs biome CVE security advisory 2025 2026"                            | No CVEs found                                                                                             |
| No CVEs for biome (supply chain)                  | WebSearch | "biomejs biome security vulnerability supply chain 2025 2026"              | No vulnerabilities found for biome specifically                                                           |
| GitHub Advisory Database                          | WebFetch  | `https://github.com/advisories?query=biomejs`                              | 0 advisories returned                                                                                     |

### Self-check

- Every version sourced from a live lookup? Yes.
- Both releases AND tags checked for pre-commit repo? Yes -- divergence found and reported (releases/latest returns v0.6.1 while tags show v2.4.8).
- Both releases AND tags checked for biome core? Yes -- releases endpoint used as primary (tags endpoint returned unrelated lsp-intellij namespace tags).
- Every dependency covered by at least one security search? Yes -- three independent searches covering biome CVEs, security advisories, and supply chain.
- Changelogs read for every upgrade (not just version existence confirmed)? Yes -- individual release notes fetched for v2.4.5, v2.4.6, v2.4.7, v2.4.8.
- SHA pinning check: Not applicable -- this task involves a biome.json schema URL and a pre-commit hook revision, not a GitHub Actions workflow. No SHA pinning required.
- Internal consistency: `$schema` in biome.json and `rev` in .pre-commit-config.yaml both reference v2.4.4 -- they agree and both need the same bump to v2.4.8.
