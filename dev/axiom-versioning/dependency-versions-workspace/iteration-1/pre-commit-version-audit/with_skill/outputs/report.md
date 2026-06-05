# Pre-Commit Hook Version Audit

**Audit complete. All data verified against live sources.**

## Inventory (6 hooks in `.pre-commit-config.yaml`)

| Hook                            | Pinned  | Latest (verified) | Status         |
|---------------------------------|---------|-------------------|----------------|
| pre-commit/pre-commit-hooks     | v6.0.0  | v6.0.0            | Current        |
| pre-commit/sync-pre-commit-deps | v0.0.3  | v0.0.3            | Current        |
| streetsidesoftware/cspell-cli   | v9.6.0  | v9.7.0            | Routine update |
| DavidAnson/markdownlint-cli2    | v0.21.0 | v0.21.0           | Current        |
| biomejs/pre-commit              | v2.4.4  | v2.4.8            | Routine update |
| gitleaks/gitleaks               | v8.30.0 | v8.30.1           | Routine update |

**No security issues found.** Security searches run against all six hooks — no CVEs or advisories found for any of them.

**Three routine updates available** (all version-bump-only, no breaking changes):

- `cspell-cli`: v9.6.0 -> v9.7.0 (CSpell engine update, released 2026-02-23)
- `biomejs/pre-commit`: v2.4.4 -> v2.4.8 (4 patch bumps, bug fixes including formatter stability)
- `gitleaks`: v8.30.0 -> v8.30.1 (maintenance; Go 1.24 build; released 2026-03-21)

**Notable verification finding:** `biomejs/pre-commit` `/releases/latest` returns stale v0.6.1 (Dec 2024). The actual latest is v2.4.8 from `/tags`. This repo uses tags-only versioning.
