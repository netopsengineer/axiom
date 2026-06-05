# Pre-Commit Hook Version Audit

**Date:** 2026-03-23
**File audited:** `.pre-commit-config.yaml`

---

## Summary

6 hooks audited. 4 require updates (all ROUTINE). No security advisories found for any hook. No hooks are abandoned or dangerously outdated.

| Hook                            | Pinned  | Latest  | Status  |
|---------------------------------|---------|---------|---------|
| pre-commit/pre-commit-hooks     | v6.0.0  | v6.0.0  | Current |
| pre-commit/sync-pre-commit-deps | v0.0.3  | v0.0.3  | Current |
| streetsidesoftware/cspell-cli   | v9.6.0  | v9.7.0  | ROUTINE |
| DavidAnson/markdownlint-cli2    | v0.21.0 | v0.22.0 | ROUTINE |
| biomejs/pre-commit              | v2.4.4  | v2.4.8  | ROUTINE |
| gitleaks/gitleaks               | v8.30.0 | v8.30.1 | ROUTINE |

---

## Decisions Required

All four deltas are ROUTINE. No SECURITY, DEPRECATION, or BREAKING-UPGRADE issues were found.

---

### gitleaks/gitleaks: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `https://api.github.com/repos/gitleaks/gitleaks/releases/latest` and `/tags`; WebFetch `https://github.com/gitleaks/gitleaks/releases`
**What changed:** Maintenance-only patch released 2026-03-21. Updated goreleaser build config, removed unnecessary functions from report template, upgraded build toolchain to Go 1.24. No new detection rules or behavioral changes.
**Breaking changes:** No
**Migration steps:** Version bump only
**Security advisories:** None found via "gitleaks tool security advisory CVE vulnerability site:github.com/gitleaks". Historical Docker image CVEs (CVE-2021-3711, CVE-2021-3712 in Alpine 3.14.1) are from 2021, affect only the Docker image distribution, and are not relevant to the pre-commit hook.
**Recommendation:** Update immediately. Two-day-old patch, zero risk, keeps your secret scanner at the latest build.
**Your call:** Bump `rev: v8.30.0` to `rev: v8.30.1`.

---

### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `https://api.github.com/repos/biomejs/pre-commit/releases/latest` returned v0.6.1 dated 2024-12-17 — this is a stale/diverged releases pointer. WebFetch `https://api.github.com/repos/biomejs/pre-commit/tags` confirmed v2.4.8 as the true latest. (This is a live example of the releases/tags divergence: `/releases/latest` is 4 months behind `/tags`.)
**What changed:** Four bug-fix releases:

- v2.4.5: Formatter idempotency fix (formatter was producing different output on successive runs in some edge cases); performance improvements in `noImportCycles` and `noEmptyBlockStatements`.
- v2.4.6: CSS/Tailwind `@utility` parser fix; Vue false-positive fix in `useAltText`.
- v2.4.7: New lint rule `noDrizzleUpdateWithoutWhere`; improved diagnostics messaging; TypeScript arrow function formatting fix; Astro frontmatter regex parse fix.
- v2.4.8: HTML parser fix for `---` inside element content; Svelte/Vue formatter no longer falsely reports already-correct files as changed; LSP crash fix on format-on-save; `noSubstr` detection improvements.
**Breaking changes:** No. All four releases are patch-level bug fixes with no removed or changed APIs.
**Migration steps:** Version bump only
**Security advisories:** None found via "biomejs biome security advisory CVE vulnerability 2025".
**Recommendation:** Update. The formatter idempotency fix in v2.4.5 is directly relevant to pre-commit usage — if hooks are producing unstable diffs on re-run, this resolves it.
**Your call:** Bump `rev: v2.4.4` to `rev: v2.4.8`.

---

### DavidAnson/markdownlint-cli2: v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `https://api.github.com/repos/DavidAnson/markdownlint-cli2/tags` (v0.22.0 confirmed); WebFetch `https://raw.githubusercontent.com/DavidAnson/markdownlint-cli2/main/CHANGELOG.md`. Note: `/releases/latest` returns 404 — this repo does not use GitHub Releases, only tags.
**What changed:** v0.22.0 adds TOML support for configuration files and a new `--configPointer` parameter; makes `--config` more flexible. v0.21.0 refactored options/configuration loading. Both are additive.
**Breaking changes:** No. CHANGELOG confirms no breaking changes. Your existing invocation (`--config .markdownlint-cli2.jsonc --fix`) is unaffected.
**Migration steps:** Version bump only
**Security advisories:** None found via "markdownlint-cli2 security advisory CVE vulnerability 2025 2026". Snyk database also lists no direct vulnerabilities.
**Recommendation:** Safe to update with no behavior changes for your current usage.
**Your call:** Bump `rev: v0.21.0` to `rev: v0.22.0`.

---

### streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `https://api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` (v9.7.0, 2026-02-23) and `/tags` (v9.7.0 confirmed); WebFetch `https://raw.githubusercontent.com/streetsidesoftware/cspell-cli/main/CHANGELOG.md`
**What changed:** Pure version tracking of the underlying CSpell library: 9.6.0 -> 9.6.3 -> 9.6.4 -> 9.7.0. No CLI API changes. The cspell-cli package version mirrors the CSpell library version directly.
**Breaking changes:** No
**Migration steps:** Version bump only
**Security advisories:** None found via "cspell-cli security advisory CVE vulnerability 2025 2026".
**Recommendation:** Safe to update.
**Your call:** Bump `rev: v9.6.0` to `rev: v9.7.0`.

---

## Hooks Already Current

### pre-commit/pre-commit-hooks: v6.0.0 — CURRENT

Verified via `https://api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest` (v6.0.0, 2025-08-09) and `/tags` (v6.0.0). You are on the latest.

Context: v6.0.0 was itself a breaking release (dropped Python < 3.9, removed `check-byte-order-marker` and `fix-encoding-pragma` hooks). Your config already uses `fix-byte-order-marker` (the correct post-migration hook) and does not reference the removed hooks, so no action needed.

No security advisories found via "pre-commit-hooks security advisory CVE 2025 2026".

### pre-commit/sync-pre-commit-deps: v0.0.3 — CURRENT

Verified via `https://api.github.com/repos/pre-commit/sync-pre-commit-deps/tags` (v0.0.3 is latest). The `/releases/latest` endpoint returns 404 — this repo uses only tags, not GitHub Releases. v0.0.3 is the latest available. Maintained by the pre-commit core team.

---

## Suggested Updated Config (version lines only)

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0          # already current

  - repo: https://github.com/pre-commit/sync-pre-commit-deps
    rev: v0.0.3          # already current

  - repo: https://github.com/streetsidesoftware/cspell-cli
    rev: v9.7.0          # was v9.6.0

  - repo: https://github.com/DavidAnson/markdownlint-cli2
    rev: v0.22.0         # was v0.21.0

  - repo: https://github.com/biomejs/pre-commit
    rev: v2.4.8          # was v2.4.4

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1         # was v8.30.0
```

---

## Verification Log

| Claim                                      | Tool      | Source                                                                              | Finding                                                                                            |
|--------------------------------------------|-----------|-------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| pre-commit/pre-commit-hooks latest release | WebFetch  | `https://api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`          | v6.0.0, 2025-08-09                                                                                 |
| pre-commit/pre-commit-hooks latest tag     | WebFetch  | `https://api.github.com/repos/pre-commit/pre-commit-hooks/tags`                     | v6.0.0 (matches)                                                                                   |
| sync-pre-commit-deps latest release        | WebFetch  | `https://api.github.com/repos/pre-commit/sync-pre-commit-deps/releases/latest`      | 404 — no GitHub Releases published                                                                 |
| sync-pre-commit-deps latest tag            | WebFetch  | `https://api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`                 | v0.0.3                                                                                             |
| cspell-cli latest release                  | WebFetch  | `https://api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`        | v9.7.0, 2026-02-23                                                                                 |
| cspell-cli latest tag                      | WebFetch  | `https://api.github.com/repos/streetsidesoftware/cspell-cli/tags`                   | v9.7.0 (matches)                                                                                   |
| cspell-cli v9.6.0->v9.7.0 changelog        | WebFetch  | `https://raw.githubusercontent.com/streetsidesoftware/cspell-cli/main/CHANGELOG.md` | No breaking changes; CSpell library version bump only                                              |
| markdownlint-cli2 latest release           | WebFetch  | `https://api.github.com/repos/DavidAnson/markdownlint-cli2/releases/latest`         | 404 — no GitHub Releases published                                                                 |
| markdownlint-cli2 latest tag               | WebFetch  | `https://api.github.com/repos/DavidAnson/markdownlint-cli2/tags`                    | v0.22.0                                                                                            |
| markdownlint-cli2 v0.21->v0.22 changelog   | WebFetch  | `https://raw.githubusercontent.com/DavidAnson/markdownlint-cli2/main/CHANGELOG.md`  | No breaking changes; TOML config support and --configPointer added                                 |
| biomejs/pre-commit latest release          | WebFetch  | `https://api.github.com/repos/biomejs/pre-commit/releases/latest`                   | v0.6.1, 2024-12-17 (DIVERGED — stale)                                                              |
| biomejs/pre-commit latest tag              | WebFetch  | `https://api.github.com/repos/biomejs/pre-commit/tags`                              | v2.4.8 (true latest)                                                                               |
| biome v2.4.4->v2.4.8 changelog             | WebSearch | biomejs.dev/internals/changelog/version/2-4-0...latest/                             | Bug fixes only; no breaking changes                                                                |
| gitleaks latest release                    | WebFetch  | `https://api.github.com/repos/gitleaks/gitleaks/releases/latest`                    | v8.30.1, 2026-03-21                                                                                |
| gitleaks latest tag                        | WebFetch  | `https://api.github.com/repos/gitleaks/gitleaks/tags`                               | v8.30.1 (matches)                                                                                  |
| gitleaks v8.30.0->v8.30.1 changelog        | WebFetch  | `https://github.com/gitleaks/gitleaks/releases`                                     | Maintenance only; build toolchain update; no behavioral changes                                    |
| pre-commit-hooks security                  | WebSearch | "pre-commit-hooks security advisory CVE 2025 2026"                                  | No advisories found                                                                                |
| cspell-cli security                        | WebSearch | "cspell-cli security advisory CVE vulnerability 2025 2026"                          | No advisories found                                                                                |
| markdownlint-cli2 security                 | WebSearch | "markdownlint-cli2 security advisory CVE vulnerability 2025 2026"                   | No advisories found                                                                                |
| biomejs/biome security                     | WebSearch | "biomejs biome security advisory CVE vulnerability 2025"                            | No advisories found                                                                                |
| gitleaks security                          | WebSearch | "gitleaks tool security advisory CVE vulnerability site:github.com/gitleaks"        | No current advisories; historical Docker image CVEs (2021) not applicable to pre-commit hook usage |
