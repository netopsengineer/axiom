# GHA CI Workflow Plan: Pre-commit, markdownlint, cspell

**Task:** Plan a GitHub Actions CI workflow for this repo that runs pre-commit hooks on PRs, plus markdownlint and cspell. Use best practices for action pinning.

**Date:** 2026-03-23

---

## Step 1: Inventory

Dependencies identified from `.pre-commit-config.yaml` and `biome.json`:

| Dependency                        | Current version | Role                                |
|-----------------------------------|-----------------|-------------------------------------|
| `pre-commit/pre-commit-hooks`     | v6.0.0          | Pre-commit hook collection          |
| `pre-commit/sync-pre-commit-deps` | v0.0.3          | Pre-commit dep sync hook            |
| `streetsidesoftware/cspell-cli`   | v9.6.0          | Spell checking (pre-commit hook)    |
| `DavidAnson/markdownlint-cli2`    | v0.21.0         | Markdown linting (pre-commit hook)  |
| `biomejs/pre-commit`              | v2.4.4          | Biome lint/format (pre-commit hook) |
| `gitleaks/gitleaks`               | v8.30.0         | Secret scanning (pre-commit hook)   |

GitHub Actions to be introduced (new — not yet in repo):

| Action                 | Purpose                       | Latest version |
|------------------------|-------------------------------|----------------|
| `actions/checkout`     | Checkout repo on PR           | v6.0.2         |
| `actions/setup-python` | Install Python for pre-commit | v6.2.0         |
| `actions/cache`        | Cache pre-commit environments | v5.0.4         |

---

## Step 2: Version Verification

### Pre-commit hook repos

| Dependency                        | Project version | Latest via releases | Latest via tags | Source                                                                                    |
|-----------------------------------|-----------------|---------------------|-----------------|-------------------------------------------------------------------------------------------|
| `pre-commit/pre-commit-hooks`     | v6.0.0          | v6.0.0              | v6.0.0          | WebFetch `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest` + `list_tags` |
| `pre-commit/sync-pre-commit-deps` | v0.0.3          | (no formal release) | v0.0.3          | WebFetch `/releases/latest` returned 404; `list_tags` shows v0.0.3 as latest              |
| `streetsidesoftware/cspell-cli`   | v9.6.0          | v9.7.0              | v9.7.0          | WebFetch `/releases/latest` + `list_tags`                                                 |
| `DavidAnson/markdownlint-cli2`    | v0.21.0         | (no formal release) | v0.22.0         | `/releases/latest` returned 404; `list_tags` shows v0.22.0 as latest                      |
| `biomejs/pre-commit`              | v2.4.4          | v0.6.1 (STALE)      | v2.4.8          | `/releases/latest` is stale (Dec 2024); tags are authoritative per skill reference        |
| `gitleaks/gitleaks`               | v8.30.0         | v8.30.1             | v8.30.1         | WebFetch `/releases/latest` + `list_tags`                                                 |

### GitHub Actions (to be introduced)

| Action                 | Latest release | Latest tag | Source                                    |
|------------------------|----------------|------------|-------------------------------------------|
| `actions/checkout`     | v6.0.2         | v6.0.2     | WebFetch `/releases/latest` + `list_tags` |
| `actions/setup-python` | v6.2.0         | v6.2.0     | WebFetch `/releases/latest` + `list_tags` |
| `actions/cache`        | v5.0.4         | v5.0.4     | WebFetch `/releases/latest` + `list_tags` |

---

## Step 3: Delta Assessment

### pre-commit/pre-commit-hooks: v6.0.0 — current, no delta

Already at latest. No action required.

### pre-commit/sync-pre-commit-deps: v0.0.3 — current, no delta

Already at latest. No action required.

### streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0

Changelog (from `CHANGELOG.md` via `get_file_contents`):

- v9.7.0 (2026-02-23): Updates CSpell version to 9.7.0. Trivial patch bumps 9.6.3 and 9.6.4 included.
- No breaking changes between v9.6.0 and v9.7.0.

### DavidAnson/markdownlint-cli2: v0.21.0 -> v0.22.0

Changelog (from `CHANGELOG.md` via `get_file_contents`):

- v0.22.0: Makes `--config` parameter more flexible, adds TOML support with `--config`, adds `--configPointer` parameter, updates dependencies.
- v0.21.0: Refactors options/configuration file loading, updates dependencies.
- The `.pre-commit-config.yaml` uses `--config .markdownlint-cli2.jsonc --fix`. The TOML support is additive and does not affect existing JSONC usage.
- No breaking changes relevant to this project's usage.

### biomejs/pre-commit: v2.4.4 -> v2.4.8

This is an annotated tag. The commit SHA was resolved via two-step lookup (get_tag returned object.type=commit at `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc`).

Changes v2.4.4 -> v2.4.8: Four patch bumps tracking `@biomejs/biome`. The biome.json uses `"$schema": "https://biomejs.dev/schemas/2.4.4/schema.json"` — this schema reference is pinned to 2.4.4 and should be updated to match the hook version if the hook is upgraded. This is a coordinated update: bump both the pre-commit hook rev AND the biome.json schema URL together.

### gitleaks/gitleaks: v8.30.0 -> v8.30.1

Changelog (WebSearch for release notes):

- v8.30.1 released 2026-03-21, one patch after v8.30.0 (2025-11-26).
- v8.30.0 introduced recursive decoding (hex, percent, base64) and new Looker/Airtable rules.
- v8.30.1 is a lightweight tag; SHA confirmed via `list_tags` as `83d9cd684c87d95d656c1458ef04895a7f1cbd8e`.
- No breaking changes between v8.30.0 and v8.30.1.

---

## Step 4: Decisions (by risk level)

### SECURITY findings

No CVEs found for any dependency in this repo. See Verification Log for search terms.

Notable ecosystem context:

- CVE-2025-30066 (`tj-actions/changed-files`): Supply chain attack via mutable tag mutation. **This is the primary reason SHA pinning is mandatory** for any GHA workflow planned here. The planned workflow MUST pin all actions to commit SHAs.
- Trivy supply chain attack (March 2026): Reinforces that mutable tags pose active supply chain risk.
- `actions/checkout` was used as an attack vector in the Trivy incident (March 2026). All the more reason to SHA-pin `actions/checkout`.

None of the specific deps in this repo have active CVEs. Security hygiene here is SHA pinning itself.

---

### BREAKING-UPGRADE: actions/checkout v4.x -> v6.0.2

**Risk level:** BREAKING-UPGRADE (major version bump: v4 -> v6)
**Verified via:** WebFetch `api.github.com/repos/actions/checkout/releases/latest` (v6.0.2, 2026-01-09) + `list_tags`
**What changed:**

- v5.0.0: Node 20 -> Node 24. Requires runner v2.327.1+.
- v6.0.0: Credentials now persisted to a separate file (not inline git config). Uses `includeIf` directives so bare `git` commands in workflows continue to work without changes.
- v6.0.2: Fix tag handling — preserves annotations and explicit `fetch-tags`.
**Breaking changes:** For most workflows, no. The credential storage change is transparent for standard use. Worktree users should test (v6.0.1 added worktree support for `persist-credentials includeIf`).
**Migration steps:** Version bump + SHA update. For this PR-check workflow, standard checkout with no custom git operations — no changes needed beyond the version.
**Security advisories:** No CVE for `actions/checkout` itself. Used as attack surface in Trivy incident (March 2026) — reinforces SHA pinning requirement.
**Recommendation:** Use v6.0.2 SHA-pinned. Node 24 runtime, latest fixes.
**Your call:** Accept v6.0.2 for new workflow? If self-hosted runners are used, verify runner >= v2.327.1.

---

### BREAKING-UPGRADE: actions/setup-python v5.x -> v6.2.0

**Risk level:** BREAKING-UPGRADE (major version bump: v5 -> v6)
**Verified via:** WebFetch `api.github.com/repos/actions/setup-python/releases/latest` (v6.2.0, 2026-01-22) + `list_tags`
**What changed:**

- v6.0.0: Node 20 -> Node 24. Requires runner v2.327.1+.
- v6.1.0/v6.2.0: Dependency upgrades (urllib3, TypeScript 5.9.3), Node 24 compatibility fixes.
- Cache key format change: `arch` added to cache key — old caches invalidated (relevant if migrating from v5).
**Breaking changes:** Cache key invalidation (old caches from v5 won't be reused — minor one-time cost). Node 24 requires runner >= v2.327.1.
**Migration steps:** Version bump + SHA update. Since this is a new workflow, no existing cache keys to invalidate.
**Security advisories:** None found via WebSearch "actions/setup-python actions/checkout CVE 2025 2026."
**Recommendation:** Use v6.2.0 SHA-pinned for a new workflow.
**Your call:** Accept v6.2.0.

---

### BREAKING-UPGRADE: actions/cache v4.x -> v5.0.4

**Risk level:** BREAKING-UPGRADE (major version; also: v4 is DEPRECATED)
**Verified via:** WebFetch `api.github.com/repos/actions/cache/releases/latest` (v5.0.4, 2026-03-18) + `list_tags`
**What changed:**

- v5.0.0: New cache service backend (v2 APIs). Cache upload up to 80% faster on GitHub-hosted runners. Node 24 runtime.
- Backward compatible — no workflow input changes required.
- Old cache service shut down April 15, 2025. Using v3/v4 in new workflows risks failure.
**Breaking changes:** None functionally. Old v3/v4 would fail due to cache service shutdown — v5 is mandatory for new workflows.
**Migration steps:** Use v5.0.4 directly in new workflow. No legacy migration needed.
**Security advisories:** None found via WebSearch "actions/cache CVE 2025 2026."
**Recommendation:** Use v5.0.4 SHA-pinned. This is the only viable version for new workflows post-April 2025 service shutdown.
**Your call:** Use v5.0.4.

---

### ROUTINE: streetsidesoftware/cspell-cli v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` (v9.7.0, 2026-02-23) + `list_tags`; changelog via `get_file_contents`
**What changed:** CSpell core updated to 9.7.0, with 9.6.3 and 9.6.4 patch bumps included.
**Breaking changes:** No.
**Migration steps:** Bump `rev: v9.6.0` to `rev: v9.7.0` in `.pre-commit-config.yaml`.
**Security advisories:** None found via WebSearch "streetsidesoftware cspell CVE 2025 2026" (Snyk shows no direct vulns).
**Recommendation:** Update as part of this batch. Zero risk.
**Your call:** Include in this batch or defer?

---

### ROUTINE: DavidAnson/markdownlint-cli2 v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** `list_tags` (`DavidAnson/markdownlint-cli2`) — latest tag v0.22.0. Changelog via `get_file_contents`.
Note: `/releases/latest` returns 404 — tags are the authoritative source.
**What changed:** `--config` more flexible, TOML support added, `--configPointer` parameter added. Dependency updates.
**Breaking changes:** No. This project uses `--config .markdownlint-cli2.jsonc` which is unaffected.
**Migration steps:** Bump `rev: v0.21.0` to `rev: v0.22.0` in `.pre-commit-config.yaml`.
**Security advisories:** None found via WebSearch "DavidAnson markdownlint-cli2 CVE 2025 2026."
**Recommendation:** Update. New `--configPointer` feature is useful; no regression risk for existing JSONC usage.
**Your call:** Include in this batch or defer?

---

### ROUTINE: biomejs/pre-commit v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags` (v2.4.8 as latest, Mar 19, 2026).
Note: `/releases/latest` returns stale v0.6.1 (Dec 2024) — tags are the authoritative source per skill reference.
**What changed:** Four patch bumps tracking @biomejs/biome. Bug fixes for Vue/Svelte/Astro file support.
**Breaking changes:** No.
**Migration steps:** Bump `rev: v2.4.4` to `rev: v2.4.8` in `.pre-commit-config.yaml`. **Coordinated update required:** also update `biome.json` `$schema` from `"https://biomejs.dev/schemas/2.4.4/schema.json"` to `"https://biomejs.dev/schemas/2.4.8/schema.json"`.
**Security advisories:** None found via WebSearch "biomejs biome CVE 2025 2026."
**Recommendation:** Update. Zero risk, picks up bug fixes. Schema URL must move with it.
**Your call:** Include in this batch or defer? If deferred, the biome.json schema URL divergence is a minor inconsistency but not a runtime error.

---

### ROUTINE: gitleaks/gitleaks v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/gitleaks/gitleaks/releases/latest` (v8.30.1, 2026-03-21) + `list_tags`
**What changed:** Patch release. v8.30.0 introduced recursive decoding and new detection rules. v8.30.1 is a bug-fix patch.
**Breaking changes:** No.
**Migration steps:** Bump `rev: v8.30.0` to `rev: v8.30.1` in `.pre-commit-config.yaml`.
**Security advisories:** No CVEs found for gitleaks itself via WebSearch "gitleaks secret scanner CVE 2025 2026." Note: gitleaks' original author released a successor tool "Betterleaks" (March 2026) citing control/ownership issues — gitleaks itself remains functional at v8.30.1 but long-term maintenance trajectory is worth monitoring.
**Recommendation:** Update to v8.30.1. Also note the Betterleaks fork for future consideration.
**Your call:** Include in this batch or defer?

---

## Step 5: Workflow Plan

### Proposed workflow: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: ["**"]

permissions:
  contents: read

jobs:
  pre-commit:
    name: Pre-commit hooks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Set up Python
        uses: actions/setup-python@a309ff8b426b58ec0e2a45f0f869d46889d02405 # v6.2.0
        with:
          python-version: "3.12"

      - name: Cache pre-commit environments
        uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7 # v5.0.4
        with:
          path: ~/.cache/pre-commit
          key: pre-commit-${{ runner.os }}-${{ hashFiles('.pre-commit-config.yaml') }}
          restore-keys: |
            pre-commit-${{ runner.os }}-

      - name: Install pre-commit
        run: pip install pre-commit

      - name: Run pre-commit (all hooks including markdownlint and cspell)
        run: pre-commit run --all-files
```

### Design notes

**Why run all hooks via pre-commit rather than separately?**

The `.pre-commit-config.yaml` already configures both `markdownlint-cli2` and `cspell` as pre-commit hooks. Running `pre-commit run --all-files` exercises them via the same path as developer workstations, ensuring CI parity. Separate `npx markdownlint-cli2` and `npx cspell` steps would introduce independent version management and can diverge from the pre-commit hook versions.

**SHA pinning rationale**

All three `actions/*` are pinned to commit SHAs. This is mandatory following CVE-2025-30066 (`tj-actions/changed-files`) and the March 2026 Trivy supply chain attack, both of which exploited mutable tags. SHA pinning means an attacker who force-pushes a tag cannot alter what the workflow runs.

**Pre-commit hook versions in CI**

Pre-commit downloads and caches hook environments from the `rev` values in `.pre-commit-config.yaml`. The workflow does not independently pin hook versions — those are controlled by the `.pre-commit-config.yaml` file checked into the repo. Keeping `.pre-commit-config.yaml` up to date (see ROUTINE decisions above) is the mechanism for controlling hook versions in CI.

**Cache key strategy**

The cache key hashes `.pre-commit-config.yaml`. Any change to hook versions (bumping `rev`) automatically busts the cache and triggers a fresh install. The `restore-keys` fallback allows partial cache reuse when only one hook version changed.

**`--all-files` vs `--from-ref`/`--to-ref`**

For simplicity and correctness, `--all-files` is recommended. A changed-files approach (`pre-commit run --from-ref origin/${{ github.base_ref }} --to-ref HEAD`) is faster on large repos but can miss issues in files that weren't changed in the PR. For a documentation-focused repo (markdown, config files), `--all-files` is the safer default and runtime is negligible.

**Permissions**

`permissions: contents: read` is the minimum needed for `actions/checkout`. No write permissions are granted, reducing blast radius if the workflow is compromised.

**Trigger**

`pull_request` on all branches. If the repo uses a trunk-based strategy (as suggested by the repo name), consider also adding `push` on the main branch to catch direct pushes.

---

### SHA reference table (for workflow authoring)

| Action / version              | Commit SHA                                 | Tag type    | Resolved via                    |
|-------------------------------|--------------------------------------------|-------------|---------------------------------|
| `actions/checkout@v6.0.2`     | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` | lightweight | `list_tags`                     |
| `actions/setup-python@v6.2.0` | `a309ff8b426b58ec0e2a45f0f869d46889d02405` | lightweight | WebFetch `git/refs/tags/v6.2.0` |
| `actions/cache@v5.0.4`        | `668228422ae6a00e4ad889ee87cd7109ec5666a7` | lightweight | WebFetch `git/refs/tags/v5.0.4` |

Pre-commit hook repos are not GitHub Actions and do not require SHA pinning in `.pre-commit-config.yaml` (pre-commit fetches them by tag, and they are not executed in the GHA runner's trusted context).

---

## Step 6: Verification Log

| Claim                                          | Tool                                         | Source                                                                                | Finding                                                                                                                        |
|------------------------------------------------|----------------------------------------------|---------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `pre-commit/pre-commit-hooks` latest is v6.0.0 | WebFetch                                     | `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`                    | v6.0.0, 2025-08-09 — matches project                                                                                           |
| `pre-commit/pre-commit-hooks` tags             | WebFetch                                     | `api.github.com/repos/pre-commit/pre-commit-hooks/tags`                               | v6.0.0 is latest tag                                                                                                           |
| `pre-commit/sync-pre-commit-deps` latest       | WebFetch                                     | `/releases/latest` → 404; `list_tags`                                                 | v0.0.3 is latest tag — matches project                                                                                         |
| `streetsidesoftware/cspell-cli` latest         | WebFetch                                     | `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`                  | v9.7.0, 2026-02-23 — project is on v9.6.0                                                                                      |
| `streetsidesoftware/cspell-cli` tags           | WebFetch                                     | `/tags`                                                                               | v9.7.0 is latest tag                                                                                                           |
| `DavidAnson/markdownlint-cli2` latest          | WebFetch                                     | `/releases/latest` → 404; `list_tags` via MCP                                         | v0.22.0 is latest tag — project is on v0.21.0                                                                                  |
| `biomejs/pre-commit` latest                    | WebFetch                                     | `api.github.com/repos/biomejs/pre-commit/releases/latest`                             | Returns stale v0.6.1 (Dec 2024)                                                                                                |
| `biomejs/pre-commit` tags                      | WebFetch                                     | `api.github.com/repos/biomejs/pre-commit/tags`                                        | v2.4.8 is latest (Mar 2026) — project is on v2.4.4                                                                             |
| `biomejs/pre-commit` v2.4.8 commit SHA         | MCP `get_tag`                                | `api.github.com/repos/biomejs/pre-commit/git/tags/...`                                | Annotated tag. Commit SHA: `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc`                                                          |
| `gitleaks/gitleaks` latest                     | WebFetch                                     | `api.github.com/repos/gitleaks/gitleaks/releases/latest`                              | v8.30.1, 2026-03-21 — project is on v8.30.0                                                                                    |
| `gitleaks/gitleaks` v8.30.1 SHA                | MCP `list_tags`                              | GitHub MCP                                                                            | `83d9cd684c87d95d656c1458ef04895a7f1cbd8e` (lightweight tag = commit SHA)                                                      |
| `actions/checkout` latest                      | WebFetch                                     | `api.github.com/repos/actions/checkout/releases/latest`                               | v6.0.2, 2026-01-09                                                                                                             |
| `actions/checkout` v6.0.2 SHA                  | WebFetch                                     | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                          | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (commit)                                                                            |
| `actions/setup-python` latest                  | WebFetch                                     | `api.github.com/repos/actions/setup-python/releases/latest`                           | v6.2.0, 2026-01-22                                                                                                             |
| `actions/setup-python` v6.2.0 SHA              | WebFetch                                     | `api.github.com/repos/actions/setup-python/git/refs/tags/v6.2.0`                      | `a309ff8b426b58ec0e2a45f0f869d46889d02405` (commit)                                                                            |
| `actions/cache` latest                         | WebFetch                                     | `api.github.com/repos/actions/cache/releases/latest`                                  | v5.0.4, 2026-03-18                                                                                                             |
| `actions/cache` v5.0.4 SHA                     | WebFetch                                     | `api.github.com/repos/actions/cache/git/refs/tags/v5.0.4`                             | `668228422ae6a00e4ad889ee87cd7109ec5666a7` (commit)                                                                            |
| `actions/checkout` v6 breaking changes         | WebSearch + `get_file_contents` CHANGELOG.md | github.com/actions/checkout                                                           | Node 24 runtime; credential file change is transparent for standard use                                                        |
| `actions/setup-python` v6 breaking changes     | WebSearch                                    | github.com/actions/setup-python/releases                                              | Node 24 runtime; cache key includes arch (new workflows unaffected)                                                            |
| `actions/cache` v5 breaking changes            | WebSearch                                    | github.com/actions/cache + GitHub Changelog                                           | New backend APIs; backward compatible; old service shut down April 2025                                                        |
| cspell-cli changelog v9.6.0->v9.7.0            | MCP `get_file_contents`                      | `github.com/streetsidesoftware/cspell-cli/CHANGELOG.md`                               | Feature: CSpell core 9.7.0. No breaking changes.                                                                               |
| markdownlint-cli2 changelog v0.21.0->v0.22.0   | MCP `get_file_contents`                      | `github.com/DavidAnson/markdownlint-cli2/CHANGELOG.md`                                | `--config` more flexible, TOML support, `--configPointer` added. No breaking changes.                                          |
| pre-commit/pre-commit-hooks CVE check          | WebSearch                                    | "pre-commit/pre-commit-hooks CVE security advisory 2025 2026"                         | No CVEs found (Snyk shows no direct vulns)                                                                                     |
| cspell CVE check                               | WebSearch                                    | "streetsidesoftware cspell CVE security advisory 2025 2026"                           | No CVEs found (Snyk: no direct vulns, latest non-vulnerable version = 9.7.0)                                                   |
| markdownlint-cli2 CVE check                    | WebSearch                                    | "DavidAnson markdownlint-cli2 CVE security advisory 2025 2026"                        | No CVEs found                                                                                                                  |
| biomejs CVE check                              | WebSearch                                    | "biomejs biome CVE security advisory 2025 2026"                                       | No CVEs found                                                                                                                  |
| gitleaks CVE check                             | WebSearch                                    | "gitleaks secret scanner CVE security vulnerability advisory 2025 2026"               | No CVEs for gitleaks itself; successor tool "Betterleaks" released March 2026                                                  |
| actions/* CVE check                            | WebSearch                                    | "actions/checkout actions/setup-python actions/cache CVE security advisory 2025 2026" | No CVEs for these specific actions; CVE-2025-30066 (tj-actions, different repo) is key supply-chain motivation for SHA pinning |

### Self-check

- Every version sourced from a live lookup: YES
- Both releases AND tags checked: YES (divergence found for `biomejs/pre-commit` and `DavidAnson/markdownlint-cli2`)
- Every dependency covered by at least one security search: YES (pre-commit hooks covered by "pre-commit/pre-commit-hooks CVE" search; actions/* covered by combined search)
- Changelogs read for every upgrade: YES (cspell-cli, markdownlint-cli2 via `get_file_contents`; checkout via `get_file_contents`; biomejs/pre-commit via get_tag message + WebSearch; gitleaks via WebSearch)
- SHA fetched for every GitHub Action: YES (checkout, setup-python, cache)
- Annotated tags resolved: YES (`biomejs/pre-commit` v2.4.8 was annotated; resolved to commit SHA `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc` via `get_tag`)
- Internal consistency: The workflow YAML above uses the exact SHAs verified in this log. The SHA reference table cross-checks them.
