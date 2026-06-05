# Biome Upgrade Analysis: 2.4.4 to Latest

**Date:** 2026-03-20
**Current version:** 2.4.4
**Latest version:** 2.4.8

---

## 1. Latest Version

The latest stable release of `@biomejs/biome` is **2.4.8**, released on **March 18, 2026**.

Release timeline for the 2.4.x patch series:

| Version | Release Date           |
|---------|------------------------|
| 2.4.4   | Feb 20, 2026 (current) |
| 2.4.5   | Mar 2, 2026            |
| 2.4.6   | Mar 5, 2026            |
| 2.4.7   | Mar 13, 2026           |
| 2.4.8   | Mar 18, 2026 (latest)  |

The corresponding pre-commit hook tag is also `v2.4.8` (repository: `https://github.com/biomejs/pre-commit`).

---

## 2. Current Configuration Review

### biome.json (current: 2.4.4)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true },
  "formatter": { "enabled": true, "indentStyle": "tab" },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": { "noImportantStyles": "off" }
    }
  },
  "javascript": { "formatter": { "quoteStyle": "double" } },
  "css": { "parser": { "tailwindDirectives": true } },
  "overrides": [
    {
      "includes": ["**/*.vue"],
      "linter": {
        "rules": {
          "correctness": {
            "noUnusedVariables": "off",
            "noUnusedImports": "off"
          }
        }
      }
    }
  ],
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  }
}
```

### .pre-commit-config.yaml (biome entry)

```yaml
- repo: https://github.com/biomejs/pre-commit
  rev: v2.4.4
  hooks:
    - id: biome-check
```

---

## 3. Breaking Changes: 2.4.4 to 2.4.8

**No breaking changes exist in the 2.4.5 through 2.4.8 patch series.** The official changelog and release notes for all four releases confirm this explicitly. The 2.4.x series consists entirely of bug fixes, performance improvements, and new opt-in nursery rules.

Your specific `biome.json` keys were checked against all changes in the range:

| Config Key                                                       | Status                                                                                                                  |
|------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| `$schema` URL                                                    | Update the version string from `2.4.4` to `2.4.8`                                                                       |
| `vcs.enabled`, `vcs.clientKind`, `vcs.useIgnoreFile`             | No changes                                                                                                              |
| `files.ignoreUnknown`                                            | No changes                                                                                                              |
| `formatter.enabled`, `formatter.indentStyle`                     | No changes                                                                                                              |
| `linter.rules.recommended`                                       | No changes                                                                                                              |
| `complexity.noImportantStyles`                                   | Rule remains active, categorized under `lint/complexity`, no changes. Setting it to `"off"` remains valid.              |
| `javascript.formatter.quoteStyle`                                | No changes                                                                                                              |
| `css.parser.tailwindDirectives`                                  | No changes                                                                                                              |
| `overrides[].includes`                                           | No changes (this was the `ignore`/`include` -> `includes` migration from v1 to v2, already correctly using `includes`)  |
| `linter.rules.correctness.noUnusedVariables` / `noUnusedImports` | 2.4.5 improved false-positive handling for Vue `<script setup>`, which benefits your override. No config change needed. |
| `assist.enabled`, `assist.actions.source.organizeImports`        | No changes                                                                                                              |

### Notable improvements that benefit your config

- **Vue `<script setup>` false positives fixed (2.4.5):** Your override disables `noUnusedVariables` and `noUnusedImports` for `.vue` files. In 2.4.5, these rules were fixed to no longer incorrectly flag functions and variables defined in `<script setup>` sections. After upgrading, you may be able to remove or narrow these overrides if you primarily use `<script setup>` syntax.

- **`organizeImports` blank line handling (2.4.5):** Fixed to correctly merge bare exports and add blank lines. Your `assist.actions.source.organizeImports: "on"` will benefit from this fix automatically.

- **LSP format-on-save crash fixed (2.4.5 and 2.4.8):** Two separate LSP crashes that could corrupt file content during format-on-save were resolved across these versions.

- **`biome ci` GitHub Actions color fix (2.4.5):** If you run Biome in CI via GitHub Actions, `biome ci` now correctly disables ANSI colors so `::error`/`::warning` workflow commands are not wrapped in escape codes.

---

## 4. New Nursery Rules (opt-in, not breaking)

The following nursery rules were added between 2.4.5 and 2.4.8. Because they are nursery rules, they are **not enabled by default** even with `recommended: true`, so they will not break your build unless you explicitly enable them.

| Rule                           | Added in | Description                                                   |
|--------------------------------|----------|---------------------------------------------------------------|
| `useVueScopedStyles`           | 2.4.5    | Vue `<style>` blocks must have `scoped` or `module` attribute |
| `useNullishCoalescing`         | 2.4.5    | Prefer `??` over `\|\|` for nullish checks                    |
| `noVueRefAsOperand`            | 2.4.5    | Prevent Vue refs used as operands without `.value`            |
| `useNamedCaptureGroup`         | 2.4.5    | Enforce named groups in regex                                 |
| `useUnicodeRegex`              | 2.4.5    | Enforce `u` or `v` flags in regex                             |
| `useArraySome`                 | 2.4.5    | Prefer `.some()` over verbose equivalents                     |
| Multiple Playwright rules (12) | 2.4.5    | Playwright testing best practices                             |
| `useBaseline`                  | 2.4.7    | CSS: report non-standard properties by Baseline tier          |
| `useImportsFirst`              | 2.4.7    | Enforce imports before other statements                       |
| `noTopLevelLiterals`           | 2.4.7    | Require root JSON values to be arrays/objects                 |
| `noEmptyObjectKeys`            | 2.4.7    | Disallow empty keys in JSON objects                           |
| `noDrizzleUpdateWithoutWhere`  | 2.4.8    | Prevent full-table Drizzle ORM updates without `.where()`     |

These may be worth enabling selectively, particularly `useVueScopedStyles` and `noVueRefAsOperand` given the project uses Vue (`.vue` override is present in the config).

---

## 5. Security Issues

**No known security vulnerabilities exist for `@biomejs/biome`.**

Multiple sources were checked:

- **GitHub Advisory Database** (`github.com/advisories?query=biomejs`): No results — no advisories have been published for `@biomejs/biome`.
- **OSV Database** (`osv.dev`): No vulnerabilities found for `@biomejs/biome` in the npm ecosystem.
- **Snyk** (`security.snyk.io/package/npm/@biomejs/biome`): No actionable CVEs found for the current package.
- **npm audit:** Historical `npm audit` warnings for Biome relate to the older, unrelated `biome` package (v0.3.3, last published 10 years ago) which used `lodash` via `inquirer`. The modern `@biomejs/biome` package does not have this dependency chain.

Biome's architecture reduces supply chain risk: it ships as a pre-compiled native binary and does not require Node.js at runtime, limiting the npm dependency surface area.

No CVEs, GHSAs, or security patches were introduced in any of the 2.4.5–2.4.8 releases.

---

## 6. Required Changes to Upgrade

### biome.json

One change is required — update the `$schema` URL version string:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.8/schema.json"
}
```

All other configuration keys are fully compatible with 2.4.8. No options were renamed, deprecated, or removed in this range.

You can also run the official migration command after updating the package to confirm no additional changes are needed:

```bash
npx @biomejs/biome migrate --write
```

### .pre-commit-config.yaml

Update the `rev` tag for the biome pre-commit hook:

```yaml
- repo: https://github.com/biomejs/pre-commit
  rev: v2.4.8
  hooks:
    - id: biome-check
```

### Package manager

If `@biomejs/biome` is in your `package.json`:

```bash
npm install --save-dev --save-exact @biomejs/biome@2.4.8
# or
pnpm add -D -E @biomejs/biome@2.4.8
# or
yarn add -D --exact @biomejs/biome@2.4.8
```

---

## 7. Optional Improvement: Review Vue Overrides

With the Vue false-positive fixes in 2.4.5, the override that turns off `noUnusedVariables` and `noUnusedImports` for `**/*.vue` files may now be overly broad. If your Vue components primarily use `<script setup>`, these rules should now work correctly without the override. You could remove the override block and test whether any false positives remain — this would restore lint coverage for genuinely unused variables in Vue files.

---

## 8. Summary

| Item                      | Current  | Latest    | Action Required       |
|---------------------------|----------|-----------|-----------------------|
| `@biomejs/biome` package  | 2.4.4    | **2.4.8** | Update package        |
| `biome.json` `$schema`    | `2.4.4`  | `2.4.8`   | Update version string |
| Other `biome.json` config | —        | —         | No changes needed     |
| Pre-commit hook `rev`     | `v2.4.4` | `v2.4.8`  | Update rev tag        |
| Breaking changes          | —        | —         | None                  |
| Security issues           | —        | —         | None known            |

The upgrade from 2.4.4 to 2.4.8 is low-risk: it is a straightforward 4-patch-version bump with no breaking changes, no config migrations required beyond the schema URL, and no security vulnerabilities in any version across this range.

---

## Sources

- [Biome GitHub Releases](https://github.com/biomejs/biome/releases)
- [Biome Version History / Changelog](https://biomejs.dev/internals/changelog/)
- [All versions since 2.4.0 | Version History | Biome](https://biomejs.dev/internals/changelog/version/2-4-0...latest/)
- [Biome v2.4 Announcement Blog Post](https://biomejs.dev/blog/biome-v2-4/)
- [Biome 2026 Roadmap](https://biomejs.dev/blog/roadmap-2026/)
- [@biomejs/biome on npm](https://www.npmjs.com/package/@biomejs/biome)
- [biomejs/pre-commit tags](https://github.com/biomejs/pre-commit/tags)
- [noImportantStyles rule docs](https://biomejs.dev/linter/rules/no-important-styles/)
- [GitHub Advisory Database — biomejs search](https://github.com/advisories?query=biomejs)
- [OSV Vulnerability Database — npm ecosystem](https://osv.dev/list?q=biomejs&ecosystem=npm)
- [Snyk — @biomejs/biome](https://security.snyk.io/package/npm/@biomejs/biome)
- [Socket.dev — @biomejs/biome](https://socket.dev/npm/package/@biomejs/biome)
