# Biome Upgrade Report: 2.4.4 -> 2.4.8

**Date:** 2026-03-23
**Task:** Upgrade biome from 2.4.4 to latest, assess breaking changes for current biome.json, check security advisories.

---

## Step 1: Inventory

### biome.json (current)

| Item                                        | Value                                                                      |
|---------------------------------------------|----------------------------------------------------------------------------|
| Schema URL                                  | `https://biomejs.dev/schemas/2.4.4/schema.json`                            |
| `vcs.enabled`                               | `true`, `clientKind: git`, `useIgnoreFile: true`                           |
| `files.ignoreUnknown`                       | `true`                                                                     |
| `formatter.indentStyle`                     | `tab`                                                                      |
| `linter.rules.recommended`                  | `true`                                                                     |
| `linter.rules.complexity.noImportantStyles` | `"off"`                                                                    |
| `javascript.formatter.quoteStyle`           | `"double"`                                                                 |
| `css.parser.tailwindDirectives`             | `true`                                                                     |
| `overrides[0]`                              | `**/*.vue` files: `noUnusedVariables` and `noUnusedImports` set to `"off"` |
| `assist.actions.source.organizeImports`     | `"on"`                                                                     |

### .pre-commit-config.yaml (current)

| Hook                               | Current rev |
|------------------------------------|-------------|
| `biomejs/pre-commit` (biome-check) | `v2.4.4`    |

---

## Step 2: Current Versions

| Package                                     | Project Version | Latest                                                       | Source                                                    |
|---------------------------------------------|-----------------|--------------------------------------------------------------|-----------------------------------------------------------|
| `@biomejs/biome` (npm)                      | 2.4.4           | **2.4.8**                                                    | npm registry + GitHub releases                            |
| `biomejs/biome` GitHub releases/latest      | —               | **2.4.8** (tag: `@biomejs/biome@2.4.8`, released 2026-03-18) | `api.github.com/repos/biomejs/biome/releases/latest`      |
| `biomejs/pre-commit` GitHub releases/latest | —               | **v0.6.1** (Dec 2024)                                        | `api.github.com/repos/biomejs/pre-commit/releases/latest` |
| `biomejs/pre-commit` GitHub tags            | v2.4.4          | **v2.4.8**                                                   | `api.github.com/repos/biomejs/pre-commit/tags`            |

**Important divergence noted:** The `biomejs/pre-commit` repo's `/releases/latest` endpoint returns `v0.6.1` (an unrelated older release), while `/tags` correctly shows `v2.4.8` as the newest tag. The correct latest pre-commit hook version to target is `v2.4.8`.

---

## Step 3: Delta Assessment

### biome (tool + pre-commit hook): 2.4.4 -> 2.4.8

This is a patch series (four patch bumps within the 2.4.x minor). Releases covered: 2.4.5, 2.4.6, 2.4.7, 2.4.8.

**What changed (relevant to your biome.json):**

None of the four patch releases introduced breaking changes, removed rules, renamed rules, or modified the config schema. All fields currently in your `biome.json` were verified to exist in the 2.4.8 schema:

- `css.parser.tailwindDirectives` — present and unchanged
- `linter.rules.complexity.noImportantStyles` — present, still active, still under `complexity`, added since v2.0.0, no deprecation
- `assist.actions.source.organizeImports` — present and unchanged; accepts `"on"` / `"off"` or an object with `level` + `options`
- `$schema` URL — must be updated from `.../schemas/2.4.4/schema.json` to `.../schemas/2.4.8/schema.json`

**Notable additions in 2.4.5 through 2.4.8 (for awareness, not breaking):**

- New nursery linting rules added (opt-in only): `noDrizzleDeleteWithoutWhere`, `noDrizzleUpdateWithoutWhere`, `useVueScopedStyles`, `useNullishCoalescing`, `noVueRefAsOperand`, `useNamedCaptureGroup`, `useUnicodeRegex`, `useArraySome`, `useBaseline`, `useImportsFirst`, `noTopLevelLiterals`, `noEmptyObjectKeys` — none affect your current config
- LSP crash fix (2.4.8): fixed crash that could corrupt file content when saving with format-on-save enabled
- `biome ci` in GitHub Actions (2.4.8): now correctly strips ANSI escape codes from `::error`/`::warning` workflow commands
- SCSS parsing improvements (2.4.7): `@if`, `@each`, `@for`, `@mixin`, `@use` now supported
- `noImportCycles` (2.4.6): performance improvement, now explicitly excludes `node_modules`
- `source.fixAll.biome` (2.4.8): no longer sorts imports when `source.organizeImports.biome` is disabled in editor settings — behaviour fix, not a breaking change

---

## Step 4: Decision

### biome: 2.4.4 -> 2.4.8

**Risk level:** ROUTINE
**Verified via:**

- `api.github.com/repos/biomejs/biome/releases/latest` — confirmed 2.4.8, released 2026-03-18
- `registry.npmjs.org/@biomejs/biome/latest` — confirmed version `2.4.8`
- `api.github.com/repos/biomejs/pre-commit/tags` — confirmed `v2.4.8` is latest tag
- `biomejs.dev/schemas/2.4.8/schema.json` — schema exists and all config fields present
- `github.com/biomejs/biome/releases/tag/@biomejs/biome@2.4.5` through `2.4.8` — release notes read
- `biomejs.dev/linter/rules/no-important-styles/` — rule confirmed active, no deprecation

**What changed:** Four patch releases (2.4.5, 2.4.6, 2.4.7, 2.4.8) containing bug fixes, performance improvements, and new opt-in nursery rules. No config schema changes. No rule removals or renames.

**Breaking changes:** No breaking changes for your specific `biome.json` configuration. All keys, rule names, and values used in your config remain valid in 2.4.8.

**Migration steps:**

1. Update `biome.json` line 2:

   ```json
   "$schema": "https://biomejs.dev/schemas/2.4.8/schema.json"
   ```

2. Update `.pre-commit-config.yaml`:

   ```yaml
   - repo: https://github.com/biomejs/pre-commit
     rev: v2.4.8
   ```

3. Update your package dependency:

   ```shell
   npm install --save-dev @biomejs/biome@2.4.8
   ```

   or equivalent for your package manager.

That is the complete migration. No config restructuring, no rule changes, no flag renaming required.

**Security advisories:** None found (see security section below).

**Recommendation:** Upgrade. This is a safe, low-risk patch series. The LSP crash fix in 2.4.8 (file content corruption on format-on-save) is a concrete reason to upgrade now if your team uses editor integration.

**Your call:** Routine version bump. No trade-offs to weigh. Upgrade when convenient, but the LSP crash fix makes sooner preferable over later.

---

## Step 5: Security

### Security search results

| Search                                                    | Finding                                                                                               |
|-----------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| `biome CVE security advisory 2025 2026` (WebSearch)       | No CVEs found for biomejs/biome                                                                       |
| `github.com/biomejs/biome/security/advisories` (WebFetch) | "There aren't any published security advisories"                                                      |
| `osv.dev/list?ecosystem=npm&q=biomejs` (WebFetch)         | No results                                                                                            |
| `biomejs biome npm security advisory osv.dev` (WebSearch) | No active advisories; Aikido Intel reports "no known vulnerabilities" for current version             |
| GitHub issue #400 (historical)                            | Past issue from v0.3.3 re: lodash/inquirer transitive vulnerabilities — resolved, not relevant to 2.x |

**Conclusion:** No security advisories found for `@biomejs/biome` via any source checked. The upgrade from 2.4.4 to 2.4.8 carries no known security implications in either direction.

---

## Step 6: Verification Log

| Claim                                               | Tool          | Source                                                         | Finding                                                                                                            |
|-----------------------------------------------------|---------------|----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| Latest biome release is 2.4.8                       | WebFetch      | `api.github.com/repos/biomejs/biome/releases/latest`           | Confirmed: `@biomejs/biome@2.4.8`, released 2026-03-18                                                             |
| biomejs/biome tags (latest)                         | WebFetch      | `api.github.com/repos/biomejs/biome/tags`                      | Returned lsp-intellij tags (wrong scope); release page used instead                                                |
| Latest biome version on npm                         | WebFetch      | `registry.npmjs.org/@biomejs/biome/latest`                     | Confirmed: `2.4.8`                                                                                                 |
| biomejs/pre-commit releases/latest                  | WebFetch      | `api.github.com/repos/biomejs/pre-commit/releases/latest`      | Returns `v0.6.1` (Dec 2024) — diverges from tags                                                                   |
| biomejs/pre-commit tags (latest)                    | WebFetch      | `api.github.com/repos/biomejs/pre-commit/tags`                 | Confirmed: `v2.4.8` is latest                                                                                      |
| biomejs/pre-commit v2.4.8 tag SHA                   | Bash (gh api) | `api.github.com/repos/biomejs/pre-commit/git/refs/tags/v2.4.8` | Tag object SHA: `d83759cbaf6baaa79e25ee04e4638d57ce7dc294`; commit SHA: `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc` |
| biome.json schema exists at 2.4.8                   | WebFetch      | `biomejs.dev/schemas/2.4.8/schema.json`                        | Schema exists; `css.parser.tailwindDirectives`, `noImportantStyles`, `assist.actions.source` all present           |
| 2.4.5 release notes                                 | WebFetch      | `github.com/biomejs/biome/releases/tag/@biomejs/biome@2.4.5`   | No breaking changes, no rule removals                                                                              |
| 2.4.6 release notes                                 | WebFetch      | `github.com/biomejs/biome/releases/tag/@biomejs/biome@2.4.6`   | No breaking changes, no rule removals                                                                              |
| 2.4.7 release notes                                 | WebFetch      | `github.com/biomejs/biome/releases/tag/@biomejs/biome@2.4.7`   | No breaking changes, no rule removals                                                                              |
| 2.4.8 release notes                                 | WebFetch      | `github.com/biomejs/biome/releases/tag/@biomejs/biome@2.4.8`   | No breaking changes, no rule removals                                                                              |
| `noImportantStyles` rule still active               | WebFetch      | `biomejs.dev/linter/rules/no-important-styles/`                | Active, under `complexity`, since v2.0.0, no deprecation                                                           |
| `assist.actions.source.organizeImports` still valid | WebSearch     | `biomejs.dev/assist/actions/organize-imports/`                 | Confirmed: accepts `"on"` shorthand                                                                                |
| No CVEs for biome                                   | WebSearch     | websearch: `biome CVE security advisory 2025 2026`             | No biome-specific CVEs found                                                                                       |
| No published GitHub security advisories             | WebFetch      | `github.com/biomejs/biome/security/advisories`                 | "There aren't any published security advisories"                                                                   |
| No OSV advisories                                   | WebFetch      | `osv.dev/list?ecosystem=npm&q=biomejs`                         | No results                                                                                                         |

### Self-check

- Every version sourced from a live lookup? Yes.
- Both releases AND tags checked? Yes — divergence between the two was found and documented for `biomejs/pre-commit`.
- Security search performed for all dependencies in scope? Yes — biome checked via WebSearch (CVE), GitHub security advisories page, and OSV.dev.
- Changelogs read for every upgrade? Yes — all four patch releases (2.4.5, 2.4.6, 2.4.7, 2.4.8) fetched from GitHub releases.
- SHA fetched for pre-commit hook? Yes — commit SHA `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc` for `v2.4.8`.

---

## Summary

Biome 2.4.8 is the latest version (npm + GitHub, confirmed 2026-03-18). The upgrade from 2.4.4 is a routine four-patch bump with no breaking changes for your `biome.json` configuration. Every config key you use — including `noImportantStyles`, `css.parser.tailwindDirectives`, and `assist.actions.source.organizeImports` — remains valid in 2.4.8. No security advisories exist for biome in any tracked database. The only required changes are the `$schema` URL in `biome.json`, the `rev` in `.pre-commit-config.yaml`, and the package version in your package manager manifest.
