# Pre-Commit Hook Version Audit

**Audit date:** 2026-03-23
**Config file:** `.pre-commit-config.yaml`

## Summary

| Hook                            | Current | Latest (releases)     | Latest (tags) | Status         |
|---------------------------------|---------|-----------------------|---------------|----------------|
| pre-commit/pre-commit-hooks     | v6.0.0  | v6.0.0                | v6.0.0        | Current        |
| pre-commit/sync-pre-commit-deps | v0.0.3  | (404 — no releases)   | v0.0.3        | Current        |
| streetsidesoftware/cspell-cli   | v9.6.0  | v9.7.0                | v9.7.0        | Behind (minor) |
| DavidAnson/markdownlint-cli2    | v0.21.0 | (404 — no releases)   | v0.22.0       | Behind (minor) |
| biomejs/pre-commit              | v2.4.4  | v0.6.1 (stale series) | v2.4.8        | Behind (patch) |
| gitleaks/gitleaks               | v8.30.0 | v8.30.1               | v8.30.1       | Behind (patch) |

No hooks have known security advisories directly applicable to their pre-commit usage. All four outdated hooks are ROUTINE bumps only.

---

## Decisions Required

### cspell-cli: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch — `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` (v9.7.0, Feb 23 2026) and `/tags` (v9.7.0, consistent)
**What changed:** Minor CSpell version bump from 9.6.x to 9.7.0. Intermediate patch releases 9.6.3 and 9.6.4 were also packaged. Release notes describe the change as "Update CSpell version (9.7.0)" with no user-facing behavioral changes documented.
**Breaking changes:** No. Release notes document no breaking changes vs v9.6.0.
**Migration steps:** Version bump only — change `rev: v9.6.0` to `rev: v9.7.0`.
**Security advisories:** CVE-2026-25931 (GHSA-mggq-68mr-58vj) was surfaced in search but targets only the `vscode-spell-checker` VS Code extension (fixed in extension v4.5.4) — it does not affect the cspell-cli command-line tool. No advisories found for cspell-cli itself via search terms "streetsidesoftware cspell-cli CVE security advisory".
**Recommendation:** Safe to bump. Routine minor version update with no breaking changes and no CLI-affecting security issues.
**Your call:** Bump `rev: v9.6.0` to `rev: v9.7.0`.

---

### markdownlint-cli2: v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** WebFetch — `api.github.com/repos/DavidAnson/markdownlint-cli2/tags` (v0.22.0, released Mar 22 2026). Note: `/releases/latest` returned 404; tags are the authoritative source for this repo.
**What changed:** v0.22.0 adds TOML support for the `--config` parameter, makes `--config` more flexible generally, and introduces a new `--configPointer` parameter. Dependencies updated to current versions. This project uses `--config .markdownlint-cli2.jsonc` — no format migration needed.
**Breaking changes:** No breaking changes documented. The `--config` and `--fix` flags used in this project's hook args are unaffected.
**Migration steps:** Version bump only — change `rev: v0.21.0` to `rev: v0.22.0`.
**Security advisories:** None found via search terms "DavidAnson markdownlint-cli2 CVE security advisory".
**Recommendation:** Safe to bump. New TOML config support is purely additive and does not affect JSONC configs already in use.
**Your call:** Bump `rev: v0.21.0` to `rev: v0.22.0`.

---

### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch — `api.github.com/repos/biomejs/pre-commit/tags` (v2.4.8, tagged Mar 19 2026). Critical caveat: the `/releases/latest` endpoint returns v0.6.1 (Dec 2024), which belongs to a stale v0.x.x release series that predates the current v2.x.x tag series. These two series are unrelated — the v2.x.x tags are automated dependency-tracking releases that were never published as GitHub Releases, only as tags. This project is already correctly pinned to the v2.x.x series (v2.4.4). This divergence matches the known pattern documented in the dependency-versions skill.
**What changed:** Four incremental dependency bumps: v2.4.5 (Mar 3), v2.4.6 (Mar 6), v2.4.7 (Mar 14), v2.4.8 (Mar 19 2026). Each commit is "build(deps): bump @biomejs/biome to 2.4.x" — automated updates keeping the pre-commit hook wrapper in sync with the upstream Biome tool.
**Breaking changes:** No. These are automated version-tracking bumps with no documented breaking changes.
**Migration steps:** Version bump only — change `rev: v2.4.4` to `rev: v2.4.8`.
**Security advisories:** No CVEs or security advisories found for biomejs/biome or the biomejs/pre-commit wrapper via search terms "biomejs biome CVE security advisory 2025 2026".
**Recommendation:** Safe to bump. Purely automated version-tracking patches. Staying current ensures the `biome-check` hook runs the same Biome version as the rest of the toolchain.
**Your call:** Bump `rev: v2.4.4` to `rev: v2.4.8`.

---

### gitleaks/gitleaks: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch — `api.github.com/repos/gitleaks/gitleaks/releases/latest` (v8.30.1, Mar 21 2026) and `/tags` (v8.30.1, consistent).
**What changed:** Four commits across 8 files: switch to Go 1.24 build toolchain (Dec 2025), minor internal improvement (Jan 2026), removal of unnecessary functions from report template (Feb 2026), updated goreleaser configuration (Mar 2026). No detection rule changes or behavioral changes documented.
**Breaking changes:** No. Patch release with build toolchain and internal cleanup changes only.
**Migration steps:** Version bump only — change `rev: v8.30.0` to `rev: v8.30.1`.
**Security advisories:** No Gitleaks-specific CVEs or GHSA advisories found via search terms "gitleaks CVE security advisory 2025 2026" and "gitleaks security advisory GitHub GHSA 2025 2026". No published vulnerabilities found in the tool itself.
**Recommendation:** Safe to bump. Minimal patch release.
**Your call:** Bump `rev: v8.30.0` to `rev: v8.30.1`.

---

## Already Current

### pre-commit/pre-commit-hooks: v6.0.0

Verified via WebFetch — `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest` and `/tags` both confirm v6.0.0 (released Aug 9 2025) as current. No action required.

No security advisories found via "pre-commit/pre-commit-hooks CVE security advisory 2025 2026".

### pre-commit/sync-pre-commit-deps: v0.0.3

Verified via WebFetch — `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags` confirms v0.0.3 is the latest tag. The `/releases/latest` endpoint returned 404 — this project publishes tags only, not GitHub Releases. v0.0.3 is current. No action required.

No security advisories found via "pre-commit sync-pre-commit-deps CVE security advisory".

---

## Suggested Batch Update

All four outdated hooks are safe to update together:

```yaml
- repo: https://github.com/streetsidesoftware/cspell-cli
  rev: v9.7.0   # was v9.6.0

- repo: https://github.com/DavidAnson/markdownlint-cli2
  rev: v0.22.0  # was v0.21.0

- repo: https://github.com/biomejs/pre-commit
  rev: v2.4.8   # was v2.4.4

- repo: https://github.com/gitleaks/gitleaks
  rev: v8.30.1  # was v8.30.0
```

After applying: run `pre-commit run --all-files` to validate all hooks pass.

---

## Verification Log

| Claim                                               | Tool      | Source                                                                                          | Finding                                                             |
|-----------------------------------------------------|-----------|-------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| pre-commit-hooks latest release = v6.0.0            | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`                              | v6.0.0 confirmed (Aug 9 2025)                                       |
| pre-commit-hooks latest tag = v6.0.0                | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/tags`                                         | v6.0.0 confirmed                                                    |
| sync-pre-commit-deps releases endpoint              | WebFetch  | `api.github.com/repos/pre-commit/sync-pre-commit-deps/releases/latest`                          | 404 — no releases published                                         |
| sync-pre-commit-deps latest tag = v0.0.3            | WebFetch  | `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`                                     | v0.0.3 confirmed (latest)                                           |
| cspell-cli latest release = v9.7.0                  | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`                            | v9.7.0 (Feb 23 2026)                                                |
| cspell-cli latest tag = v9.7.0                      | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/tags`                                       | v9.7.0 confirmed                                                    |
| cspell-cli v9.6.0 -> v9.7.0 changelog               | WebFetch  | `github.com/streetsidesoftware/cspell-cli/releases/tag/v9.7.0`                                  | Version bump only, no breaking changes                              |
| CVE-2026-25931 scope                                | WebFetch  | `sentinelone.com/vulnerability-database/cve-2026-25931/`                                        | Affects vscode-spell-checker VS Code extension only, not cspell-cli |
| cspell-cli security advisories                      | WebSearch | "streetsidesoftware cspell-cli CVE security advisory"                                           | No CLI-affecting CVEs found                                         |
| markdownlint-cli2 releases endpoint                 | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/releases/latest`                             | 404 — no releases published                                         |
| markdownlint-cli2 latest tag = v0.22.0              | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`                                        | v0.22.0 confirmed                                                   |
| markdownlint-cli2 v0.21.0 -> v0.22.0 changelog      | WebFetch  | `github.com/DavidAnson/markdownlint-cli2/blob/main/CHANGELOG.md`                                | TOML config support added, no breaking changes                      |
| markdownlint-cli2 v0.22.0 release date              | WebFetch  | `github.com/DavidAnson/markdownlint-cli2/releases/tag/v0.22.0`                                  | Released Mar 22 2026                                                |
| markdownlint-cli2 security advisories               | WebSearch | "DavidAnson markdownlint-cli2 CVE security advisory"                                            | No CVEs found                                                       |
| biomejs/pre-commit releases/latest = v0.6.1 (stale) | WebFetch  | `api.github.com/repos/biomejs/pre-commit/releases/latest`                                       | v0.6.1 (Dec 2024) — stale v0.x.x series, not the active series      |
| biomejs/pre-commit latest tag = v2.4.8              | WebFetch  | `api.github.com/repos/biomejs/pre-commit/tags`                                                  | v2.4.8 confirmed (Mar 19 2026); all 30 tags are v2.x.x              |
| biomejs/pre-commit v2.4.4 date                      | WebFetch  | `github.com/biomejs/pre-commit/releases/tag/v2.4.4`                                             | Feb 21 2026                                                         |
| biomejs/pre-commit v2.4.8 date                      | WebFetch  | `github.com/biomejs/pre-commit/releases/tag/v2.4.8`                                             | Mar 19 2026                                                         |
| biomejs/pre-commit v2.4.4->v2.4.8 changes           | WebFetch  | `github.com/biomejs/pre-commit/commits/main`                                                    | 4 automated biome version bumps (v2.4.5, v2.4.6, v2.4.7, v2.4.8)    |
| biome security advisories                           | WebSearch | "biomejs biome CVE security advisory 2025 2026"                                                 | No CVEs found for biome toolchain                                   |
| gitleaks latest release = v8.30.1                   | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/releases/latest`                                        | v8.30.1 (Mar 21 2026)                                               |
| gitleaks latest tag = v8.30.1                       | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/tags`                                                   | v8.30.1 confirmed                                                   |
| gitleaks v8.30.0 -> v8.30.1 changelog               | WebFetch  | `github.com/gitleaks/gitleaks/compare/v8.30.0...v8.30.1`                                        | 4 commits: Go 1.24, internal cleanup, goreleaser update             |
| gitleaks security advisories                        | WebSearch | "gitleaks CVE security advisory 2025 2026" + "gitleaks security advisory GitHub GHSA 2025 2026" | No Gitleaks-specific CVEs found                                     |
| pre-commit-hooks security advisories                | WebSearch | "pre-commit/pre-commit-hooks CVE security advisory 2025 2026"                                   | No CVEs found                                                       |
| sync-pre-commit-deps security advisories            | WebSearch | "pre-commit sync-pre-commit-deps CVE security advisory"                                         | No CVEs found                                                       |

### Self-check

- Every version sourced from a live lookup: Yes.
- Both releases AND tags checked for all repos: Yes. Notable divergences found: biomejs/pre-commit (`releases/latest` returns stale v0.6.1; `tags` shows active v2.4.8); markdownlint-cli2 (`releases/latest` = 404; `tags` = v0.22.0); sync-pre-commit-deps (`releases/latest` = 404; `tags` = v0.0.3).
- Every dependency covered by at least one security search: Yes.
- Changelogs read for every upgrade: Yes — cspell-cli, markdownlint-cli2, biomejs/pre-commit, and gitleaks all checked.
- SHA pinning: Not applicable. This is `.pre-commit-config.yaml`, not GitHub Actions. Pre-commit hooks use tag-based `rev` pinning by framework convention; commit SHA pinning is not standard for this tool.
- Internal consistency: Config file uses one `rev` per repo. No cross-reference inconsistencies found.
