# Pre-commit Hook Version Audit

**Audited file:** `.pre-commit-config.yaml`
**Audit date:** 2026-03-23

---

## Summary

6 hooks audited. 2 are current. 4 are behind. 0 have confirmed security advisories.

| Hook                            | Configured | Latest  | Status           |
|---------------------------------|------------|---------|------------------|
| pre-commit/pre-commit-hooks     | v6.0.0     | v6.0.0  | Current          |
| pre-commit/sync-pre-commit-deps | v0.0.3     | v0.0.3  | Current          |
| streetsidesoftware/cspell-cli   | v9.6.0     | v9.7.0  | Behind (ROUTINE) |
| DavidAnson/markdownlint-cli2    | v0.21.0    | v0.22.0 | Behind (ROUTINE) |
| biomejs/pre-commit              | v2.4.4     | v2.4.8  | Behind (ROUTINE) |
| gitleaks/gitleaks               | v8.30.0    | v8.30.1 | Behind (ROUTINE) |

No SECURITY or DEPRECATION findings. All four deltas are ROUTINE.

---

## Findings by Risk Level

### ROUTINE

---

### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags` (2026-03-23). Note: `/releases/latest` returns stale v0.6.1 (Dec 2024) — tags are the authoritative source for this repo. Tags show v2.4.8 as the most recent.
**What changed:** 4 patch bumps (v2.4.5, v2.4.6, v2.4.7, v2.4.8) tracking @biomejs/biome releases. The biomejs/pre-commit repository does not publish formal GitHub Releases for the v2.x series — changes are tracked via tags only. Biome's own changelog notes nursery lint rule additions (opt-in, not enabled by default) and bug fixes for Vue/Svelte/Astro file handling in this range.
**Breaking changes:** No
**Migration steps:** Version bump only. Change `rev: v2.4.4` to `rev: v2.4.8`. No biome.json changes required.
**Security advisories:** None found via WebSearch "biomejs biome CVE 2025 2026" and WebFetch `github.com/biomejs/biome/releases`. No GHSA entries found.
**Recommendation:** Update. Zero risk, picks up 4 patch versions of bug fixes.
**Your call:** Include in next batch update or defer — no urgency.

---

### gitleaks/gitleaks: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/gitleaks/gitleaks/releases/latest` returns v8.30.1, published 2026-03-21. WebFetch `api.github.com/repos/gitleaks/gitleaks/tags` confirms v8.30.1 as latest tag. Both sources agree.
**What changed:** Maintenance release. Updates goreleaser tooling, removes unnecessary functions from report template, switches to Go 1.24 internally. No new detection rules, no rule removals.
**Breaking changes:** No
**Migration steps:** Version bump only. Change `rev: v8.30.0` to `rev: v8.30.1`.
**Security advisories:** None found. WebSearch "gitleaks CVE security advisory 2025 2026" returned no gitleaks-specific results. WebFetch `github.com/gitleaks/gitleaks/security/advisories` explicitly states "There aren't any published security advisories" for this repository.
**Recommendation:** Update. This is your secrets scanner — keeping it current is good hygiene even for a maintenance bump.
**Your call:** Include in next batch update or defer — no urgency.

---

### streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` returns v9.7.0, published 2026-02-23. WebFetch `api.github.com/repos/streetsidesoftware/cspell-cli/tags` confirms v9.7.0 as the most recent tag. Both sources agree.
**What changed:** Tracks the upstream `cspell` library to v9.7.0. Intermediate releases v9.6.3 and v9.6.4 are included. No new CLI flags. No config format changes. Primarily dependency sync.
**Breaking changes:** No
**Migration steps:** Version bump only. Change `rev: v9.6.0` to `rev: v9.7.0`. No changes to `cspell.json` required.
**Security advisories:** None found via WebSearch "streetsidesoftware cspell-cli CVE security advisory 2025 2026". Snyk reports no direct vulnerabilities for the `cspell` npm package as of the latest available data.
**Recommendation:** Update. Maintenance release, no risk.
**Your call:** Include in next batch update or defer — no urgency.

---

### DavidAnson/markdownlint-cli2: v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/DavidAnson/markdownlint-cli2/tags` returns v0.22.0 as the most recent tag. Note: `api.github.com/repos/DavidAnson/markdownlint-cli2/releases` returns an empty array — this project does not publish formal GitHub Releases. Tags are the sole authoritative source.
**What changed:** v0.22.0 adds TOML configuration file support for the `--config` parameter, a new `--configPointer` parameter, and makes `--config` more flexible. Your config uses `--config .markdownlint-cli2.jsonc` with `--fix` — neither of these is affected by the changes.
**Breaking changes:** No. The changelog explicitly notes no breaking changes in v0.21.0 or v0.22.0.
**Migration steps:** Version bump only. Change `rev: v0.21.0` to `rev: v0.22.0`. Your existing `args` array (`["--config", ".markdownlint-cli2.jsonc", "--fix"]`) continues to work unchanged.
**Security advisories:** None found via WebSearch "DavidAnson markdownlint-cli2 CVE security advisory 2025 2026". No GHSA advisories found for this package.
**Recommendation:** Update. New features don't affect your usage; dependency updates are included.
**Your call:** Include in next batch update or defer — no urgency.

---

## Current (no action needed)

### pre-commit/pre-commit-hooks: v6.0.0 — current

**Verified via:** WebFetch `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest` returns v6.0.0, published 2025-08-09. WebFetch `api.github.com/repos/pre-commit/pre-commit-hooks/tags` confirms v6.0.0 as the most recent tag. Both sources agree.
**Security advisories:** None found via WebSearch "pre-commit/pre-commit-hooks CVE security advisory 2025 2026".

---

### pre-commit/sync-pre-commit-deps: v0.0.3 — current

**Verified via:** WebFetch `api.github.com/repos/pre-commit/sync-pre-commit-deps/releases/latest` returns 404 (no formal releases published). WebFetch `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags` shows v0.0.3 as the most recent and only relevant tag. You are on the latest.
**Security advisories:** None found via WebSearch "pre-commit sync-pre-commit-deps CVE security advisory".

---

## Verification Log

| Claim                                       | Tool      | Source                                                                 | Finding                                                    |
|---------------------------------------------|-----------|------------------------------------------------------------------------|------------------------------------------------------------|
| pre-commit-hooks latest is v6.0.0           | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`     | v6.0.0, published 2025-08-09                               |
| pre-commit-hooks latest tag                 | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/tags`                | v6.0.0 — matches release                                   |
| sync-pre-commit-deps has no formal releases | WebFetch  | `api.github.com/repos/pre-commit/sync-pre-commit-deps/releases/latest` | 404 — no releases                                          |
| sync-pre-commit-deps latest tag is v0.0.3   | WebFetch  | `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`            | v0.0.3 confirmed                                           |
| cspell-cli latest release is v9.7.0         | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`   | v9.7.0, published 2026-02-23                               |
| cspell-cli latest tag is v9.7.0             | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/tags`              | v9.7.0 — matches release                                   |
| markdownlint-cli2 has no formal releases    | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/releases`           | empty array                                                |
| markdownlint-cli2 latest tag is v0.22.0     | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`               | v0.22.0 confirmed                                          |
| markdownlint-cli2 v0.22.0 changelog         | WebFetch  | `github.com/DavidAnson/markdownlint-cli2/blob/main/CHANGELOG.md`       | TOML support, --configPointer added, no breaking changes   |
| biomejs/pre-commit releases/latest stale    | WebFetch  | `api.github.com/repos/biomejs/pre-commit/releases/latest`              | Returns v0.6.1 (Dec 2024) — stale                          |
| biomejs/pre-commit latest tag is v2.4.8     | WebFetch  | `api.github.com/repos/biomejs/pre-commit/tags`                         | v2.4.8 confirmed                                           |
| gitleaks latest release is v8.30.1          | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/releases/latest`               | v8.30.1, published 2026-03-21                              |
| gitleaks latest tag is v8.30.1              | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/tags`                          | v8.30.1 — matches release                                  |
| gitleaks v8.30.1 changelog                  | WebFetch  | `github.com/gitleaks/gitleaks/releases/tag/v8.30.1`                    | Maintenance: goreleaser update, Go 1.24, no security fixes |
| gitleaks security advisories                | WebFetch  | `github.com/gitleaks/gitleaks/security/advisories`                     | "No published security advisories"                         |
| pre-commit-hooks security                   | WebSearch | "pre-commit/pre-commit-hooks CVE security advisory 2025 2026"          | No CVEs found                                              |
| cspell-cli security                         | WebSearch | "streetsidesoftware cspell-cli CVE security advisory 2025 2026"        | No CVEs found                                              |
| markdownlint-cli2 security                  | WebSearch | "DavidAnson markdownlint-cli2 CVE security advisory 2025 2026"         | No CVEs found                                              |
| biomejs security                            | WebSearch | "biomejs biome CVE 2025 2026"                                          | No CVEs found                                              |
| gitleaks security                           | WebSearch | "gitleaks CVE security advisory 2025 2026"                             | No gitleaks-specific CVEs found                            |
| sync-pre-commit-deps security               | WebSearch | "pre-commit sync-pre-commit-deps CVE security advisory"                | No CVEs found                                              |

---

## Self-check

- Every version sourced from a live lookup: Yes.
- Both releases AND tags checked for all repos: Yes. Divergence noted for biomejs/pre-commit (releases stale at v0.6.1, tags show v2.4.8) and markdownlint-cli2 (no releases at all, only tags).
- Every dependency covered by at least one security search: Yes. All 6 repos searched individually.
- Changelogs read for every upgrade: Yes (cspell-cli v9.7.0, markdownlint-cli2 v0.22.0, gitleaks v8.30.1 release notes, biomejs commit range noted as tags-only).
- No GitHub Actions in this config — SHA pinning not applicable.
- Internal consistency: No cross-references within the config file to check.
