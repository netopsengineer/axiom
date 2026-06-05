# Pre-commit Hook Version Audit

**File audited:** `.pre-commit-config.yaml`
**Audit date:** 2026-03-23

---

## Summary

| Hook                            | Current | Latest  | Status  |
|---------------------------------|---------|---------|---------|
| pre-commit/pre-commit-hooks     | v6.0.0  | v6.0.0  | Current |
| pre-commit/sync-pre-commit-deps | v0.0.3  | v0.0.3  | Current |
| streetsidesoftware/cspell-cli   | v9.6.0  | v9.7.0  | BEHIND  |
| DavidAnson/markdownlint-cli2    | v0.21.0 | v0.22.0 | BEHIND  |
| biomejs/pre-commit              | v2.4.4  | v2.4.8  | BEHIND  |
| gitleaks/gitleaks               | v8.30.0 | v8.30.1 | BEHIND  |

No SECURITY-level findings. All gaps are ROUTINE patch/minor bumps.

---

## ROUTINE Findings

### streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` (Feb 23, 2026) and `/tags` (top tag: v9.7.0)
**What changed:** Bundles CSpell core 9.7.0, which included two intermediate patch bumps (9.6.3, 9.6.4) before the minor release. No specific changes to the CLI wrapper itself beyond the dependency bump.
**Breaking changes:** None documented in the release notes.
**Migration steps:** Version bump only. Change `rev: v9.6.0` to `rev: v9.7.0`.
**Security advisories:** None found via WebSearch "streetsidesoftware cspell-cli CVE security advisory 2025 2026"
**Recommendation:** Routine update. Zero friction, picks up any bug fixes in CSpell core since 9.6.0.
**Your call:** Include in next batch update or apply now — no reason to defer.

---

### DavidAnson/markdownlint-cli2: v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/DavidAnson/markdownlint-cli2/tags` (top tags: v0.22.0, v0.21.0). Note: `/releases/latest` returned 403; tags are the authoritative source here.
**What changed:** v0.22.0 adds TOML support to the `--config` parameter and introduces a new `--configPointer` parameter for finer-grained configuration control. v0.21.0 had refactored options/configuration file loading as groundwork for these additions. The project config (`.markdownlint-cli2.jsonc`) is unaffected by the new TOML option — it continues to work unchanged.
**Breaking changes:** None. The new parameters are purely additive.
**Migration steps:** Version bump only. Change `rev: v0.21.0` to `rev: v0.22.0`. The existing `args: ["--config", ".markdownlint-cli2.jsonc", "--fix"]` invocation is unchanged.
**Security advisories:** None found via WebSearch "DavidAnson markdownlint-cli2 CVE security advisory 2025 2026"
**Recommendation:** Safe to update. No behavioral change for this project's usage pattern.
**Your call:** Include in next batch update.

---

### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags` (Mar 19, 2026). Top tag: v2.4.8 (commit `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc`).
**Important note:** `/releases/latest` returns stale v0.6.1 (Dec 17, 2024). The v2.x series is published as tags only — not as GitHub Releases. Tags are the authoritative source. This is the classic releases-vs-tags divergence.
**What changed:** Four patch bumps (v2.4.5 on Mar 3, v2.4.6 on Mar 6, v2.4.7 on Mar 14, v2.4.8 on Mar 19), each tracking the corresponding `@biomejs/biome` package version. All 8 commits between v2.4.4 and v2.4.8 are automated dependency updates bumping the bundled biome binary. No config schema changes.
**Breaking changes:** None.
**Migration steps:** Version bump only. Change `rev: v2.4.4` to `rev: v2.4.8`.
**Security advisories:** None found via WebSearch "biomejs biome CVE security advisory 2025 2026"
**Recommendation:** Update. Four patch versions behind; all are mechanical tracking bumps with zero risk.
**Your call:** Include in next batch update.

---

### gitleaks/gitleaks: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/gitleaks/gitleaks/releases/latest` (Mar 21, 2026) and `/tags` (top tag: v8.30.1)
**What changed:** v8.30.1 is a maintenance release: goreleaser tooling update, removal of unnecessary functions from the report template, and a switch from Go 1.23 to Go 1.24 for the build. v8.30.0 added detection rules for Looker client ID/secret and Airtable Personal Access Token. Neither release includes breaking changes to detection behavior or configuration format.
**Breaking changes:** None.
**Migration steps:** Version bump only. Change `rev: v8.30.0` to `rev: v8.30.1`.
**Security advisories:** No CVEs specific to the gitleaks tool itself found via WebSearch "gitleaks security vulnerability CVE advisory 2025 2026". (Search results for "gitleaks CVE" returned CVEs for Git itself, not the gitleaks secrets scanner.)
**Recommendation:** Apply the one-patch bump. v8.30.1 was released two days ago (Mar 21, 2026).
**Your call:** Include in next batch update.

---

## Hooks Already Current

**pre-commit/pre-commit-hooks @ v6.0.0** — confirmed current via WebFetch `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`. Released Aug 9, 2025. Next tag after v6.0.0 does not exist. No action needed.

**pre-commit/sync-pre-commit-deps @ v0.0.3** — confirmed current via WebFetch `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`. Only three tags exist (v0.0.1, v0.0.2, v0.0.3); v0.0.3 is the latest. No formal releases exist (`/releases/latest` returned 404). No action needed.

---

## Suggested Updated Config (version bumps only)

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

| Claim                                       | Tool      | Source                                                                     | Finding                                                          |
|---------------------------------------------|-----------|----------------------------------------------------------------------------|------------------------------------------------------------------|
| pre-commit-hooks latest is v6.0.0           | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`         | v6.0.0, Aug 9, 2025                                              |
| pre-commit-hooks tags                       | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/tags`                    | Top tag: v6.0.0 — agrees with releases                           |
| sync-pre-commit-deps latest                 | WebFetch  | `api.github.com/repos/pre-commit/sync-pre-commit-deps/releases/latest`     | 404 — no formal releases                                         |
| sync-pre-commit-deps tags                   | WebFetch  | `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`                | Three tags; v0.0.3 is latest                                     |
| cspell-cli latest is v9.7.0                 | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`       | v9.7.0, Feb 23, 2026                                             |
| cspell-cli tags                             | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/tags`                  | Top tag: v9.7.0 — agrees with releases                           |
| cspell-cli v9.6.0->v9.7.0 changelog         | WebFetch  | `github.com/streetsidesoftware/cspell-cli/releases/tag/v9.7.0`             | CSpell core bump, no breaking changes                            |
| markdownlint-cli2 latest                    | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/releases/latest`        | 403 — used tags instead                                          |
| markdownlint-cli2 tags                      | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`                   | Top tag: v0.22.0                                                 |
| markdownlint-cli2 v0.22.0 changelog         | WebFetch  | `raw.githubusercontent.com/DavidAnson/markdownlint-cli2/main/CHANGELOG.md` | TOML support, --configPointer added; no breaking changes         |
| biomejs/pre-commit latest release           | WebFetch  | `api.github.com/repos/biomejs/pre-commit/releases/latest`                  | v0.6.1 (Dec 2024) — STALE; v2.x not published as GitHub Releases |
| biomejs/pre-commit tags                     | WebFetch  | `api.github.com/repos/biomejs/pre-commit/tags`                             | Top tag: v2.4.8 — authoritative source                           |
| biomejs/pre-commit v2.4.4->v2.4.8 changelog | WebFetch  | `github.com/biomejs/pre-commit/compare/v2.4.4...v2.4.8`                    | 8 commits, all biome version bumps; no breaking changes          |
| gitleaks latest is v8.30.1                  | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/releases/latest`                   | v8.30.1, Mar 21, 2026                                            |
| gitleaks tags                               | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/tags`                              | Top tag: v8.30.1 — agrees with releases                          |
| gitleaks v8.30.1 changelog                  | WebFetch  | `github.com/gitleaks/gitleaks/releases/tag/v8.30.1`                        | Maintenance only; no security fixes                              |
| pre-commit-hooks security                   | WebSearch | "pre-commit/pre-commit-hooks CVE security advisory 2025 2026"              | No CVEs found                                                    |
| cspell-cli security                         | WebSearch | "streetsidesoftware cspell-cli CVE security advisory 2025 2026"            | No CVEs found                                                    |
| markdownlint-cli2 security                  | WebSearch | "DavidAnson markdownlint-cli2 CVE security advisory 2025 2026"             | No CVEs found                                                    |
| biomejs security                            | WebSearch | "biomejs biome CVE security advisory 2025 2026"                            | No CVEs found                                                    |
| gitleaks security                           | WebSearch | "gitleaks security vulnerability CVE advisory 2025 2026"                   | No CVEs found for the tool itself                                |
| sync-pre-commit-deps security               | WebSearch | "pre-commit sync-pre-commit-deps CVE security advisory 2025 2026"          | No CVEs found                                                    |

**Self-check:**

- Every version sourced from a live lookup: yes
- Both releases AND tags checked for all six repos: yes (biomejs releases/latest divergence confirmed and documented)
- Every dependency covered by at least one security search: yes
- Changelogs read for every upgrade: yes
- No GitHub Actions referenced in this config — SHA pinning not applicable
- No false contemporaneity claims found in the config file itself (`.pre-commit-config.yaml` contains no descriptive labels)
- No internal inconsistencies found
