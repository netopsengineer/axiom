# Pre-commit Hook Version Audit

**Project reviewed:** `.pre-commit-config.yaml`
**Task type:** Review (auditing an existing config) — findings below are ordered by
risk level per the dependency-versions skill; no shipping-timeline question needed.
**Audit date:** 2026-07-06

## Summary

- **5 third-party, SHA-pinned pre-commit hooks** were inventoried and checked
  against live GitHub tag/release data and OSV.dev.
- **No security advisories (SECURITY)** found for any of the 5 hooks — verified
  via OSV.dev batch scan plus targeted WebSearch fallback for each tool.
- **1 BREAKING-UPGRADE**: `markdownlint-cli2` is one minor version behind
  (v0.22.1 -> v0.23.0), and the new version raises the required Node.js version.
- **1 ROUTINE** update available: `zizmor-pre-commit` is two patch releases
  behind (v1.25.2 -> v1.26.1).
- **1 CORRECTION**: the comment above the `markdownlint-cli2` entry asserts
  v0.22.1 is "the latest tag," which is no longer true as of v0.23.0
  (released 2026-07-01).
- **1 maintenance-health flag (non-version-delta)**: `gitleaks` itself is fully
  up to date, but its own README now states the project is feature-complete
  and will receive security-patch-only releases going forward, with the
  maintainer shifting focus to a successor project (Betterleaks). Not an
  action item today, but relevant to long-term tool selection.
- `gitleaks`, `actionlint`, and `shellcheck-py` are confirmed current against
  their upstream latest tags/releases — no action needed.
- All 5 pinned SHAs were independently verified to resolve to the exact tag
  claimed in each `# frozen: vX.Y.Z` comment — no mismatched pins found.
- The `local:` hooks (biome, claude-plugin-validate, repo-invariants,
  automation-script-tests, validate-plugins-smoke-tests,
  readme-generated-blocks, yaml-syntax, spelling, markdown-links) call npm
  scripts and carry no external version pin in this file — their versions are
  single-sourced in `package.json`, which was not provided as an input to this
  audit and is out of scope here.

## Step 1: Inventory

| # | Hook repo | Pinned rev (SHA) | Comment claims | Type |
|---|-----------|-------------------|-----------------|------|
| 1 | `local` (9 hooks) | n/a | n/a | Delegates to npm scripts; versioned via `package.json` (not provided, out of scope) |
| 2 | `DavidAnson/markdownlint-cli2` | `996abf60411a8d954288ac9856aae7602b80cbda` | `frozen: v0.22.1` | Third-party, SHA-pinned |
| 3 | `gitleaks/gitleaks` | `83d9cd684c87d95d656c1458ef04895a7f1cbd8e` | `frozen: v8.30.1` | Third-party, SHA-pinned |
| 4 | `rhysd/actionlint` | `914e7df21a07ef503a81201c76d2b11c789d3fca` | `frozen: v1.7.12` | Third-party, SHA-pinned |
| 5 | `shellcheck-py/shellcheck-py` | `745eface02aef23e168a8afb6b5737818efbea95` | `frozen: v0.11.0.1` | Third-party, SHA-pinned |
| 6 | `zizmorcore/zizmor-pre-commit` | `9257c6050c0261b8c57e712f632dc4a8010109a9` | `frozen: v1.25.2` | Third-party, SHA-pinned |

## Step 2/3: Findings, grouped by risk (highest first)

### SECURITY

None found. OSV.dev batch scan (`scripts/osv_scan.py`) returned `[CLEAN]` for
all 5 hooks, both at the pinned version and with no version filter (i.e., zero
advisories exist for these package identities in OSV at all, not just for the
pinned version). WebSearch fallback cross-checks (see Verification Log) found
no CVEs or GHSA advisories for any of the 5 tools either.

### DEPRECATION / Maintenance health (informational — no version delta)

**gitleaks/gitleaks — maintenance status change**

**Risk level:** DEPRECATION (maintenance-health signal, not a version delta —
the pin is already current)
**Verified via:** WebFetch `https://github.com/gitleaks/gitleaks` (README, 2026-07-06)
**What changed:** The project's own README now states: "Gitleaks is feature
complete. I'm not merging new features into Gitleaks. Future releases will be
security patches only," and that the maintainer is "shifting my focus to
[Betterleaks](https://github.com/betterleaks/betterleaks)."
**Breaking changes:** No — v8.30.1 remains fully functional and is the current
latest tag/release.
**Migration steps:** None required now. Worth tracking Betterleaks as a
potential future replacement if gitleaks' security-patch-only cadence becomes
insufficient.
**Security advisories:** None found (see SECURITY section above).
**Recommendation:** Keep the current pin. No urgency, but flag this for
periodic re-review since the tool is no longer receiving feature development.
**Your call:** Acknowledge and revisit in 6-12 months, or evaluate Betterleaks
sooner if secret-scanning coverage gaps appear.

### BREAKING-UPGRADE

### DavidAnson/markdownlint-cli2: v0.22.1 -> v0.23.0

**Risk level:** BREAKING-UPGRADE
**Verified via:** WebFetch `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`
(latest tag `v0.23.0`, commit `534166213006ec869b773b7ed8c6ebeaad1165d0`,
committed 2026-07-01) — `/releases/latest` returns HTTP 404 (this project
ships no GitHub Releases, confirming the existing comment's premise); raw
`CHANGELOG.md` at the `v0.23.0` tag and `package.json` `engines` field at that
tag were fetched directly.
**What changed:** Per `CHANGELOG.md`: "Add `overrides` configuration option",
"Improve options/configuration file handling", "Update dependencies (including
`markdownlint`)", and "Remove support for end-of-life Node 20". The `v0.23.0`
`package.json` sets `"engines": {"node": ">=22"}` (up from Node 20 support in
`v0.22.1`).
**Breaking changes:** Yes — environments/CI runners pinned to Node 20 can no
longer run this hook version. Since `pre-commit`'s `language: node` support
provisions its own Node runtime via `nodeenv`, most local/CI setups won't need
manual Node upgrades, but any environment that pins a specific Node version for
`nodeenv` or lacks Node 22 availability should verify before upgrading.
**Migration steps:** Bump the pin. Old:
`rev: 996abf60411a8d954288ac9856aae7602b80cbda # frozen: v0.22.1`. New:
`rev: 534166213006ec869b773b7ed8c6ebeaad1165d0 # frozen: v0.23.0`. No
`.markdownlint-cli2.jsonc` changes are required unless you want to adopt the
new `overrides` option.
**Security advisories:** None found via OSV.dev (`npm:markdownlint-cli2`, all
versions) and WebSearch "markdownlint-cli2 CVE security advisory".
**Recommendation:** Upgrade when convenient. It is not urgent (no security or
functional regression in staying on v0.22.1), but the Node 20 floor is a real
breaking change to be aware of before bumping, not a drop-in patch.
**Your call:** Bump now (per the `prek auto-update --freeze` maintenance
process already documented in this file) or defer until Node 22+ availability
is confirmed across all environments that run this hook.

### ROUTINE

### zizmorcore/zizmor-pre-commit: v1.25.2 -> v1.26.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/zizmorcore/zizmor-pre-commit/tags`
(latest tag `v1.26.1`, commit `e3eebf65325ccc992422292cb7a4baee967cf815`) and
`releases/latest` (same, published 2026-06-21); GitHub release bodies for
`zizmorcore/zizmor` `v1.26.0` and `v1.26.1` fetched directly via
`api.github.com/repos/zizmorcore/zizmor/releases/tags/{tag}`.
**What changed:** v1.26.0 added three new audits (`typosquat-uses`,
`unsound-ternary`, `adhoc-packages`), made `known-vulnerable-actions`
configurable, improved `cache-poisoning` detection and `unpinned-uses`
auto-fix, and fixed several bugs (LSP dependabot.yaml recognition,
`ref-version-mismatch` matching, `dependabot-cooldown` autofix config,
SARIF/Annotations output paths). v1.26.1 is described in its release notes as
"a small corrective release" for v1.26.0 with no further changelog detail.
**Breaking changes:** Two noted in v1.26.0: the `impostor-commit` audit no
longer suggests auto-fixes, and JSON/SARIF output dropped a "misleading prefix
key." Neither affects this repo's usage — the hook is invoked with no custom
args or output-format parsing (`- id: zizmor` only).
**Migration steps:** Version bump only. Old:
`rev: 9257c6050c0261b8c57e712f632dc4a8010109a9 # frozen: v1.25.2`. New:
`rev: e3eebf65325ccc992422292cb7a4baee967cf815 # frozen: v1.26.1`.
**Security advisories:** None found via OSV.dev (`cargo:zizmor`, all versions)
and WebSearch "zizmor security advisory CVE 2025 2026".
**Recommendation:** Update. Zero risk to current usage, and picks up 3 new
hardening audits relevant to this repo's own workflow-security posture.
**Your call:** Include in this batch or defer — either is safe.

### CORRECTION

### "markdownlint-cli2 ... SHA-frozen to v0.22.1, the latest tag": CORRECTION

**Risk level:** CORRECTION
**What is stated:** The comment block above the `repos:` list reads:
"the hook is pinned — SHA-frozen to v0.22.1, the latest tag (this project
ships NO GitHub releases; tags are the only source)."
**What is correct:** v0.22.1 was the latest tag at some point, but as of
2026-07-01 `v0.23.0` is the latest tag (verified via
`api.github.com/repos/DavidAnson/markdownlint-cli2/tags`). The "no GitHub
releases" half of the claim remains true and verified (`/releases/latest`
still 404s) — only the "v0.22.1 ... the latest tag" half is now stale.
**Why it matters:** A maintainer reading this comment without independently
checking tags would believe the pin is already current and skip the upgrade
entirely — the comment actively asserts freshness that no longer holds.
**Fix:** Either update the pin to `v0.23.0` (resolving both the version delta
and the comment in one change), or, if deferring the bump, reword the comment
to drop the "the latest tag" claim, e.g.: "SHA-frozen to v0.22.1 (this project
ships NO GitHub releases; tags are the only source) — v0.23.0 is newer as of
2026-07."

## Confirmed current (no decision needed)

| Hook | Pinned | Latest tag | Latest release | Verified via |
|------|--------|-----------|-----------------|--------------|
| `gitleaks/gitleaks` | v8.30.1 | v8.30.1 | v8.30.1 (2026-03-21) | `api.github.com/repos/gitleaks/gitleaks/{tags,releases/latest}` |
| `rhysd/actionlint` | v1.7.12 | v1.7.12 | v1.7.12 (2026-03-30) | `api.github.com/repos/rhysd/actionlint/{tags,releases/latest}` |
| `shellcheck-py/shellcheck-py` | v0.11.0.1 | v0.11.0.1 | n/a (no GitHub releases) | `api.github.com/repos/shellcheck-py/shellcheck-py/tags`; upstream `koalaman/shellcheck` latest is also v0.11.0 (2025-08-04), so the wrapped binary is current too |

All three pins were also confirmed to resolve their `rev` SHA to the exact tag
named in their `# frozen:` comment (no silent SHA/tag mismatch).

## Step 6: Verification Log

| Claim | Tool | Source | Finding |
|-------|------|--------|---------|
| markdownlint-cli2 latest tag | WebFetch (via `gh api`) | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags` | `v0.23.0`, commit `534166213006ec869b773b7ed8c6ebeaad1165d0` |
| markdownlint-cli2 has no GitHub Releases | WebFetch (via `gh api`) | `api.github.com/repos/DavidAnson/markdownlint-cli2/releases/latest` and `/releases` | 404 / `[]` — confirmed no releases exist |
| markdownlint-cli2 v0.22.1 pin resolves correctly | WebFetch (via `gh api`) | `api.github.com/repos/DavidAnson/markdownlint-cli2/git/refs/tags/v0.22.1` | SHA `996abf6...` matches the pinned `rev` exactly |
| markdownlint-cli2 v0.23.0 changelog | WebFetch (raw file) | `raw.githubusercontent.com/DavidAnson/markdownlint-cli2/v0.23.0/CHANGELOG.md` | Confirms `overrides` option, dependency updates, and "Remove support for end-of-life Node 20" |
| markdownlint-cli2 v0.23.0 Node requirement | WebFetch (raw file) | `raw.githubusercontent.com/DavidAnson/markdownlint-cli2/v0.23.0/package.json` | `engines.node: ">=22"` |
| markdownlint-cli2 security advisories | OSV batch scan + WebSearch | `scripts/osv_scan.py "npm:markdownlint-cli2@0.22.1"` and `npm:markdownlint-cli2` (no version); WebSearch "markdownlint-cli2 CVE security advisory" | `[CLEAN]` in OSV (both queries); no CVEs found via WebSearch |
| gitleaks latest tag/release | WebFetch (via `gh api`) | `api.github.com/repos/gitleaks/gitleaks/{tags,releases/latest}` | Both report `v8.30.1`; matches pin |
| gitleaks v8.30.1 pin resolves correctly | WebFetch (via `gh api`) | `api.github.com/repos/gitleaks/gitleaks/git/refs/tags/v8.30.1` | SHA `83d9cd6...` matches the pinned `rev` exactly |
| gitleaks maintenance status | WebFetch | `https://github.com/gitleaks/gitleaks` (README) | README states project is feature-complete, security-patches-only going forward, maintainer moving to Betterleaks |
| gitleaks security advisories | OSV batch scan + WebSearch | `scripts/osv_scan.py "go:github.com/gitleaks/gitleaks/v8@8.30.1"` and unversioned; WebSearch "gitleaks CVE security advisory 2025 2026" | `[CLEAN]` in OSV; WebSearch surfaced only unrelated Git (not Gitleaks) CVE-2025-48384 and an old Chainguard-packaging CVE-2023-45288 tied to a transitive Go HTTP/2 dependency, not gitleaks core |
| actionlint latest tag/release | WebFetch (via `gh api`) | `api.github.com/repos/rhysd/actionlint/{tags,releases/latest}` | Both report `v1.7.12`; matches pin |
| actionlint v1.7.12 pin resolves correctly | WebFetch (via `gh api`) | `api.github.com/repos/rhysd/actionlint/git/refs/tags/v1.7.12` | SHA `914e7df...` matches the pinned `rev` exactly |
| actionlint security advisories | OSV batch scan + WebSearch | `scripts/osv_scan.py "go:github.com/rhysd/actionlint@1.7.12"` and unversioned; WebSearch "actionlint rhysd CVE security advisory" | `[CLEAN]` in OSV; no CVEs found via WebSearch (project has no SECURITY.md) |
| shellcheck-py latest tag | WebFetch (via `gh api`) | `api.github.com/repos/shellcheck-py/shellcheck-py/tags` and `/releases/latest` (404 — no releases) | Latest tag `v0.11.0.1`; matches pin |
| shellcheck-py v0.11.0.1 pin resolves correctly | WebFetch (via `gh api`) | `api.github.com/repos/shellcheck-py/shellcheck-py/git/refs/tags/v0.11.0.1` | SHA `745eface0...` matches the pinned `rev` exactly |
| shellcheck-py wraps current upstream shellcheck binary | WebFetch (via `gh api`) + WebFetch | `api.github.com/repos/koalaman/shellcheck/releases/latest`; `pypi.org/pypi/shellcheck-py/json` | Upstream `shellcheck` latest is `v0.11.0` (2025-08-04); PyPI `shellcheck-py` latest is `0.11.0.1` (2025-08-09) — wrapper is current with upstream |
| shellcheck-py / shellcheck security advisories | OSV batch scan + WebSearch | `scripts/osv_scan.py "pypi:shellcheck-py@0.11.0.1"` and unversioned; WebSearch "shellcheck-py OR shellcheck CVE security advisory 2025 2026" | `[CLEAN]` in OSV; no CVEs found via WebSearch |
| zizmor-pre-commit latest tag/release | WebFetch (via `gh api`) | `api.github.com/repos/zizmorcore/zizmor-pre-commit/{tags,releases/latest}` | Both report `v1.26.1`, commit `e3eebf653...` |
| zizmor-pre-commit v1.25.2 pin resolves correctly | WebFetch (via `gh api`) | `api.github.com/repos/zizmorcore/zizmor-pre-commit/git/refs/tags/v1.25.2` | SHA `9257c605...` matches the pinned `rev` exactly |
| zizmor v1.26.0 / v1.26.1 changelog | WebFetch (via `gh api`, release body) | `api.github.com/repos/zizmorcore/zizmor/releases/tags/v1.26.0` and `/v1.26.1` | New audits, enhancements, 2 breaking changes (impostor-commit autofix, SARIF prefix key); v1.26.1 is a small corrective release |
| zizmor security advisories | OSV batch scan + WebSearch | `scripts/osv_scan.py "cargo:zizmor@1.25.2"` and unversioned; WebSearch "zizmor security advisory CVE 2025 2026" | `[CLEAN]` in OSV; no CVEs found via WebSearch |

### Self-check

- Every version sourced from a live lookup: yes, all 5 hooks checked via GitHub
  API tags + releases/latest (both endpoints, per skill requirement).
- Both releases AND tags checked: yes, for all 5 hooks — 2 of 5
  (`markdownlint-cli2`, `shellcheck-py`) have no GitHub Releases at all
  (404 confirmed), consistent with the existing comment for `markdownlint-cli2`
  and independently discovered (not previously documented in-file) for
  `shellcheck-py`.
- Every dependency covered by the OSV scan or a documented WebSearch fallback:
  yes — all 5 hooks queried through `osv_scan.py` using best-fit ecosystem
  identities (`npm`, `Go`, `PyPI`, `crates.io`; none of these 5 are GitHub
  Actions, so the `[REVIEW]`-range-comparison case does not apply here), each
  cross-checked with an additional WebSearch given their role as
  security-relevant tooling (secret scanner, workflow hardening linter).
- Changelogs read for every upgrade (not just version existence confirmed):
  yes — `markdownlint-cli2` `CHANGELOG.md` fetched at the target tag; `zizmor`
  GitHub release bodies fetched for both intermediate and target versions.
- SHA fetched and verified for every GitHub Action/hook reference: yes, all 5
  pinned SHAs were independently re-derived from their claimed tag and found
  to match exactly (no silent mismatch between `rev` and the `# frozen:`
  comment).
- Internal consistency: the only cross-reference issue found is the
  `markdownlint-cli2` "latest tag" claim (CORRECTION, above); no other
  disagreements found between comments and rev pins in this file.
- False contemporaneity claims: 1 found and reported as a dedicated CORRECTION
  (`markdownlint-cli2` "the latest tag"), kept separate from its
  BREAKING-UPGRADE version-delta finding per the dual-finding rule.
- Advisory integrity: no advisories were found for any of the 5 hooks, so no
  CVE/GHSA IDs are cited in this report; the one CVE mentioned
  (CVE-2025-48384) is explicitly flagged as pertaining to Git, not gitleaks,
  to avoid a false-attribution error, and is not counted as a gitleaks
  finding.
