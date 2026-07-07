# Pre-commit Hook Version Audit

**Project under review:** `.pre-commit-config.yaml` (axiom marketplace repo)
**Task type:** Review (auditing an existing config)
**Audit date:** 2026-07-06

## Inventory

| Hook repo | Pinned ref | Type |
|---|---|---|
| `local` (biome, claude-plugin-validate, repo-invariants, automation-script-tests, validate-plugins-smoke-tests, readme-generated-blocks, yaml-syntax, spelling, markdown-links) | n/a — runs `npm run <script>` | No external version pinned directly in this file |
| `DavidAnson/markdownlint-cli2` | `996abf6...` (`v0.22.1`) | Third-party, SHA-pinned |
| `gitleaks/gitleaks` | `83d9cd6...` (`v8.30.1`) | Third-party, SHA-pinned |
| `rhysd/actionlint` | `914e7df...` (`v1.7.12`) | Third-party, SHA-pinned |
| `shellcheck-py/shellcheck-py` | `745eface...` (`v0.11.0.1`) | Third-party, SHA-pinned |
| `zizmorcore/zizmor-pre-commit` | `9257c60...` (`v1.25.2`) | Third-party, SHA-pinned |

No CVEs or security advisories were found for any of the five pinned tools (searches below). One dependency is stale, and one has a stale in-file comment.

## Findings by risk level

### BREAKING-UPGRADE

#### markdownlint-cli2: v0.22.1 -> v0.23.0

**Risk level:** BREAKING-UPGRADE
**Verified via:** GitHub API `api.github.com/repos/DavidAnson/markdownlint-cli2/tags` (v0.23.0, commit `534166213006ec869b773b7ed8c6ebeaad1165d0`, tagged 2026-07-01) and `/releases/latest` (404 — this repo publishes no formal GitHub Releases, confirming the config's own comment that tags are the only source)
**What changed:** Adds an `overrides` configuration option; updates the bundled `markdownlint` dependency. v0.22.1 itself was a dependency-only patch release (no functional change from v0.22.0).
**Breaking changes:** Yes — drops support for end-of-life Node 20. **Not applicable to this repo**: every workflow in `.github/workflows/` pins `node-version: 24`, so this breaking change has no practical impact here.
**Migration steps:** Version bump only for this repo. Update the pin to `534166213006ec869b773b7ed8c6ebeaad1165d0 # frozen: v0.23.0`.
**Security advisories:** None found via WebSearch "markdownlint-cli2 CVE security advisory 2025 2026" (Snyk/GitHub Advisory DB both show no known vulnerabilities for this package).
**Recommendation:** Safe to take now — released only 5 days before this audit, likely just outside Dependabot's 7-day minor-bump cooldown window (`.github/dependabot.yml` sets `semver-minor-days: 7`), so a Dependabot PR should appear around 2026-07-08 if the pipeline is healthy.
**Your call:** Take the bump now, or let Dependabot open the PR in ~2 days.

### ROUTINE

#### zizmor-pre-commit: v1.25.2 -> v1.26.1

**Risk level:** ROUTINE
**Verified via:** GitHub API `api.github.com/repos/zizmorcore/zizmor-pre-commit/releases/latest` and `/tags` (both agree: v1.26.1, commit `e3eebf65325ccc992422292cb7a4baee967cf815`, published 2026-06-21). Pinned SHA `9257c6050c0261b8c57e712f632dc4a8010109a9` confirmed via `git/refs/tags/v1.25.2`.
**What changed:** Two releases behind (v1.25.2 → v1.26.0 → v1.26.1). v1.26.0 adds new audits (`unsound-ternary`, `adhoc-packages`), makes `known-vulnerable-actions` configurable, improves cache-poisoning detection, and fixes several false-positive/annotation bugs. v1.26.1 is a same-day corrective patch for v1.26.0.
**Breaking changes:** No.
**Migration steps:** Version bump only. Update the pin to `e3eebf65325ccc992422292cb7a4baee967cf815 # frozen: v1.26.1`.
**Security advisories:** None found via WebSearch "zizmor CVE security advisory 2025 2026". (One unrelated hit, GHSA-965h-392x-2mh5, is a transitive `rustls-webpki` advisory in Chainguard's *container image* of zizmor — irrelevant to the pre-commit hook usage here.)
**Recommendation:** Update soon rather than urgently — this is a security-scanning tool, so the new audit rules (wider coverage) are worth having, but nothing about the current pin is broken or vulnerable. Note this release is 15 days old, i.e., already past Dependabot's 7-day minor-bump cooldown — worth checking whether a Dependabot PR is open/stuck for this one.
**Your call:** Batch this with the markdownlint-cli2 bump, or take it standalone.

### CORRECTION

#### markdownlint-cli2 comment: "the latest tag"

**Risk level:** CORRECTION
**What is stated:** The config comment above the `markdownlint-cli2` entry reads: "SHA-frozen to v0.22.1, the latest tag (this project ships NO GitHub releases; tags are the only source)."
**What is correct:** v0.22.1 was superseded by v0.23.0 on 2026-07-01. As of this audit (2026-07-06), v0.22.1 is no longer the latest tag. (The parenthetical about no GitHub Releases existing is still accurate — verified via the 404 above.)
**Why it matters:** The comment's job is to justify *why* the pin is trustworthy ("it's the latest, we checked"). Left uncorrected after the bump lands, a stale version of this comment would misinform whoever reads it next.
**Fix:** When bumping the pin, update the comment to reference v0.23.0 (or drop the specific version from the prose and let the `# frozen:` tag be the single source of truth, avoiding future duplication drift).

## Confirmed current (no action needed)

- **gitleaks/gitleaks** — pinned `v8.30.1` matches both `/releases/latest` and `/tags` (commit `83d9cd684c87d95d656c1458ef04895a7f1cbd8e`, published 2026-03-21). No CVEs found via WebSearch "gitleaks CVE security advisory 2026".
- **rhysd/actionlint** — pinned `v1.7.12` matches both `/releases/latest` and `/tags` (commit `914e7df21a07ef503a81201c76d2b11c789d3fca`, published 2026-03-30). No CVEs found; repo has no SECURITY.md/advisory history.
- **shellcheck-py/shellcheck-py** — pinned `v0.11.0.1` matches the latest tag (commit `745eface02aef23e168a8afb6b5737818efbea95`; this repo also has no GitHub Releases, only tags). Bundles upstream `shellcheck` v0.11.0, which is itself confirmed current via `koalaman/shellcheck/releases/latest`. No CVEs found for either package.

## Context notes (adjacent to this file, not pinned in it)

- **Biome** (driven by the `biome` local hook via `npm run lint:fix`): `package.json` pins `@biomejs/biome@^2.5.2`, which resolves to the current npm `latest` (2.5.2) — confirmed current. No dedicated CVE found; one changelog reference to a prior "internal CVE" fix predates this already-current release.
- **prek** (the hook runner itself): `package.json` devDependency `@j178/prek@^0.4.8` resolves to npm `latest` (0.4.8) — current. Flagging for awareness only: there IS a critical CVE (GHSA-pwf7-47c3-mfhx, CVSS 9.9, arbitrary code injection via `prek-version`/`extra_args` inputs) — but it affects the unrelated GitHub Action wrapper **`j178/prek-action`**, fixed in v1.0.6. Confirmed via repo-wide grep that no workflow in `.github/workflows/` uses `j178/prek-action`, so this does not apply here. Noted only to prevent future confusion between the CLI and the Action.
- Dependabot is correctly configured for the `pre-commit` ecosystem (`.github/dependabot.yml`, daily schedule, grouped, `semver-minor-days: 7` / `semver-patch-days: 3` cooldowns) — this validates the pre-commit-config.yaml header comment's claim that "Dependabot tracks matching release tags."

## Verification log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| markdownlint-cli2 latest tag/release | Bash `curl` (GitHub API) | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`, `/releases/latest` | Latest tag v0.23.0 (2026-07-01); no Releases published (404) |
| markdownlint-cli2 pinned SHA integrity | Bash `curl` | `.../git/refs/tags/v0.22.1` | SHA matches config exactly |
| markdownlint-cli2 changelog | WebFetch | `raw.githubusercontent.com/.../CHANGELOG.md` | v0.23.0 adds `overrides`, drops Node 20; v0.22.1 was dep-only |
| markdownlint-cli2 CVEs | WebSearch | "markdownlint-cli2 CVE security advisory 2025 2026" | None found |
| gitleaks latest tag/release | Bash `curl` | `api.github.com/repos/gitleaks/gitleaks/{releases/latest,tags}` | v8.30.1 matches pin, both sources agree |
| gitleaks pinned SHA integrity | Bash `curl` | `.../git/refs/tags/v8.30.1` | SHA matches |
| gitleaks CVEs | WebSearch | "gitleaks CVE security advisory 2026" | None found |
| actionlint latest tag/release | Bash `curl` | `api.github.com/repos/rhysd/actionlint/{releases/latest,tags}` | v1.7.12 matches pin, both agree |
| actionlint pinned SHA integrity | Bash `curl` | `.../git/refs/tags/v1.7.12` | SHA matches |
| actionlint CVEs | WebSearch | "actionlint CVE security advisory 2025 2026" | None found |
| shellcheck-py latest tag | Bash `curl` | `api.github.com/repos/shellcheck-py/shellcheck-py/tags` (releases/latest → 404) | v0.11.0.1 matches pin, no Releases exist |
| shellcheck-py pinned SHA integrity | Bash `curl` | `.../git/refs/tags/v0.11.0.1` | SHA matches |
| upstream shellcheck currency | Bash `curl` | `api.github.com/repos/koalaman/shellcheck/releases/latest` | v0.11.0 — matches bundled version, upstream also current |
| shellcheck CVEs | WebSearch | "shellcheck CVE security advisory 2025 2026" | None found |
| zizmor-pre-commit latest tag/release | Bash `curl` | `api.github.com/repos/zizmorcore/zizmor-pre-commit/{releases/latest,tags}` | v1.26.1 (2026-06-21) — pin (v1.25.2) is 2 releases behind |
| zizmor-pre-commit pinned SHA integrity | Bash `curl` | `.../git/refs/tags/v1.25.2` | SHA matches pin (confirms what's pinned, not that it's current) |
| zizmor v1.26.0/v1.26.1 changelog | WebSearch | "zizmor v1.26.0 v1.26.1 changelog release notes" | New audits, config improvements, bug fixes; no breaking changes |
| zizmor CVEs | WebSearch | "zizmor CVE security advisory 2025 2026" | None found (one unrelated transitive advisory in Chainguard's container build) |
| Biome currency | Bash `curl` | `registry.npmjs.org/@biomejs/biome/latest` | 2.5.2 matches `package.json` pin `^2.5.2` |
| Biome CVEs | WebSearch | "biome CVE security advisory 2025 2026 biomejs" | No dedicated CVE found |
| prek CLI currency | Bash `curl` | `registry.npmjs.org/@j178/prek/latest` | 0.4.8 matches `package.json` pin `^0.4.8` |
| prek security | WebSearch | "prek j178 CVE security advisory 2025 2026" | Critical CVE found, but in unrelated `j178/prek-action` GH Action, not the CLI; confirmed unused via repo grep |
| Dependabot pre-commit coverage | Read | `.github/dependabot.yml` | Confirms header comment's claim; explains cooldown-driven lag on markdownlint-cli2 |
| CI Node version (for Node 20 EOL relevance) | Bash `grep` | `.github/workflows/*.yml` | All workflows use `node-version: 24` — Node 20 drop is inapplicable |

**Self-check:**

- Every version sourced from a live lookup — yes, no `[UNVERIFIED]` markers needed.
- Both releases AND tags checked for every GitHub-hosted repo — yes (markdownlint-cli2 and shellcheck-py have no Releases at all, confirmed via 404, so tags are correctly treated as authoritative).
- Every dependency covered by a security search — yes, individually.
- Changelogs read for both upgrades found (markdownlint-cli2, zizmor-pre-commit) — yes.
- SHA fetched/verified for every pinned GitHub Action/hook reference — yes; all were plain commit objects, no annotated-tag resolution needed.
- Internal consistency — one issue found and reported above (CORRECTION: stale "latest tag" comment).
- False contemporaneity claims — one found and reported (markdownlint-cli2 comment).
