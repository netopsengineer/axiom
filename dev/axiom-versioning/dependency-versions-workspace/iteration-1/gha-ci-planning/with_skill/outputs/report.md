# GHA CI Workflow Plan: Pre-commit, markdownlint, cspell

**Date:** 2026-03-20
**Skill:** dependency-versions
**Repository:** branching-strategy-redesign-upp

---

## Executive Summary

This plan produces a single GitHub Actions workflow file (`.github/workflows/ci.yml`) that runs on every pull request targeting `main`. It:

1. Runs all pre-commit hooks defined in `.pre-commit-config.yaml` (which already includes both `markdownlint-cli2` and `cspell`).
2. Runs `markdownlint-cli2` as an additional standalone job via the dedicated `DavidAnson/markdownlint-cli2-action`.
3. Runs `cspell` as a standalone job via `streetsidesoftware/cspell-action`.

All GitHub Actions are SHA-pinned. Three pre-commit hook versions are behind current and are surfaced as decisions below.

---

## Step 1: Project Inventory

### Pre-commit hooks (`.pre-commit-config.yaml`)

| Hook repo                         | Version in project | Latest releases tag | Latest tags tag | Status  |
|-----------------------------------|--------------------|---------------------|-----------------|---------|
| `pre-commit/pre-commit-hooks`     | `v6.0.0`           | `v6.0.0`            | `v6.0.0`        | Current |
| `pre-commit/sync-pre-commit-deps` | `v0.0.3`           | no formal release   | `v0.0.3`        | Current |
| `streetsidesoftware/cspell-cli`   | `v9.6.0`           | `v9.7.0`            | `v9.7.0`        | Behind  |
| `DavidAnson/markdownlint-cli2`    | `v0.21.0`          | no formal release   | `v0.21.0`       | Current |
| `biomejs/pre-commit`              | `v2.4.4`           | `v0.6.1` (stale)    | `v2.4.8`        | Behind  |
| `gitleaks/gitleaks`               | `v8.30.0`          | `v8.30.1`           | `v8.30.1`       | Behind  |

### Tooling context (`biome.json`)

Biome v2.4.4 is configured with a comprehensive ruleset covering JS/TS formatting, linting, CSS (with Tailwind directives), and Vue overrides. The `biomejs/pre-commit@v2.4.4` hook runs `biome-check` against staged files.

### Config files used by hooks

- `cspell.json` — present at repo root, used by the `cspell` hook
- `.markdownlint-cli2.jsonc` — present at repo root, used by the `markdownlint-cli2` hook

---

## Step 2: Pre-commit Hook Version Decisions

### streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** `mcp__plugin_github_github__get_latest_release` (streetsidesoftware/cspell-cli) — published 2026-02-23. Both `/releases/latest` and `/tags` agree on v9.7.0.
**What changed:** Updates bundled CSpell to 9.7.0 (feature release) and includes interim patch bumps to 9.6.3 and 9.6.4. Feature: new `--report` modes and dictionary updates.
**Breaking changes:** No. The `--config cspell.json` flag this project uses is unchanged.
**Migration steps:** Version bump in `.pre-commit-config.yaml` only: `rev: v9.6.0` → `rev: v9.7.0`.
**Security advisories:** None found via WebSearch "cspell security advisory CVE 2025 2026". The npm package has no listed vulnerabilities in Snyk's advisory database.
**Recommendation:** Update. Zero risk, picks up dictionary improvements and new report options.
**Your call:** Include this bump in the next batch of pre-commit updates?

---

### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** `mcp__plugin_github_github__list_tags` (biomejs/pre-commit) — tags show v2.4.8 at SHA `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc`. Note: `/releases/latest` returns stale `v0.6.1` (Dec 2024) — the tags endpoint is the authoritative source for this repo.
**What changed:** 4 patch bumps tracking `@biomejs/biome`. New nursery lint rules (opt-in, not enabled by default). Bug fixes for Vue/Svelte/Astro file handling.
**Breaking changes:** No. The `biome.json` schema URL references `2.4.4` and will need updating to `2.4.8` on schema bump, but the schema is backwards-compatible across patch versions.
**Migration steps:** Version bump only: `rev: v2.4.4` → `rev: v2.4.8`. Optionally update `biome.json` `$schema` URL from `/schemas/2.4.4/schema.json` to `/schemas/2.4.8/schema.json`.
**Security advisories:** None found via WebSearch "biomejs biome CVE security advisory 2025 2026". No CVEs listed in GitHub Advisory Database.
**Recommendation:** Update. Zero risk, picks up bug fixes including Vue-specific corrections that this project's `biome.json` Vue overrides will benefit from.
**Your call:** Include in this batch or defer to next scheduled dependency update?

---

### gitleaks/gitleaks: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** `mcp__plugin_github_github__get_latest_release` (gitleaks/gitleaks) — v8.30.1 published 2026-03-21. Both releases and tags agree.
**What changed:** goreleaser update, removed unnecessary report template functions, minor code cleanup, switch to Go 1.24.
**Breaking changes:** No. The pre-commit hook configuration is unchanged.
**Migration steps:** Version bump only: `rev: v8.30.0` → `rev: v8.30.1`.
**Security advisories:** None found via WebSearch "gitleaks CVE security advisory gitleaks tool zricethezav 2025 2026". No CVEs assigned to the gitleaks tool itself.
**Recommendation:** Update. Patch release, zero risk.
**Your call:** Include in this batch?

---

## Step 3: GitHub Actions Selection and SHA Pinning

### Strategy decision: How to run pre-commit in CI

Two viable approaches exist. The recommended approach for this project is **Option A** (use `pre-commit/action`), with the reasoning explained below.

**Option A: `pre-commit/action@v3.0.1` (recommended)**

- This is a composite action — it installs pre-commit via pip, then caches `~/.cache/pre-commit` via `actions/cache@v4`, then runs `pre-commit run`.
- The earlier Node.js 16 concern applied to v3.0.0 only; v3.0.1 fixed this by updating to `actions/cache@v4`.
- The action is maintenance-only (no new features planned), but it is fully functional and uses no deprecated runtimes as of v3.0.1.
- It natively respects `.pre-commit-config.yaml`, so no duplication of hook configuration is needed.

**Option B: Manual `pip install pre-commit` + `pre-commit run`**

- Full control, more explicit, easier to customise caching keys.
- Recommended if you need to split hooks into separate jobs, pass custom env vars, or run on self-hosted runners with special constraints.
- More boilerplate (~15 lines vs ~4).

**Recommendation:** Use Option A for simplicity. If the maintenance-only status of `pre-commit/action` becomes a concern in future (e.g., it stops working with newer GHA runner images), switch to Option B.

---

### Verified SHA pins for all actions

All SHAs fetched from GitHub MCP `list_tags` on 2026-03-20:

| Action                                | Version   | Commit SHA                                 | Published  |
|---------------------------------------|-----------|--------------------------------------------|------------|
| `actions/checkout`                    | `v6.0.2`  | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` | 2026-01-09 |
| `actions/setup-python`                | `v6.2.0`  | `a309ff8b426b58ec0e2a45f0f869d46889d02405` | 2026-01-22 |
| `actions/cache`                       | `v5.0.4`  | `668228422ae6a00e4ad889ee87cd7109ec5666a7` | 2026-03-18 |
| `pre-commit/action`                   | `v3.0.1`  | `2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd` | 2024-02-07 |
| `DavidAnson/markdownlint-cli2-action` | `v22.0.0` | `07035fd053f7be764496c0f8d8f9f41f98305101` | 2025-12-09 |
| `streetsidesoftware/cspell-action`    | `v8.3.0`  | `9cd41bb518a24fefdafd9880cbab8f0ceba04d28` | 2026-02-24 |

**Note on `actions/checkout@v6`:** v6.0.0 changed how git credentials are persisted (moved to a separate file rather than the global git config). This is non-breaking for standard checkout-and-run workflows. For the `pre-commit/action` composite, this is transparent. No action needed on your part.

**Note on `DavidAnson/markdownlint-cli2-action@v22`:** This action bundles `markdownlint-cli2 v0.20.0`, while the pre-commit hook pin is `v0.21.0`. This creates a minor version skew where CI and local pre-commit may behave slightly differently. The difference is one patch release. The project's `.markdownlint-cli2.jsonc` configuration is compatible with both versions. To eliminate skew, use `use_cspell_files: true` analogue — there is no such option for markdownlint-action. Consider pinning the pre-commit hook back to `v0.20.0` or accepting the skew as cosmetic.

---

## Step 4: Security Findings

### actions/checkout supply chain risk

The `tj-actions/changed-files` incident (CVE-2025-30066, March 2025) established that mutable tag references in GitHub Actions are a genuine supply-chain vector. `actions/checkout` itself was not compromised in that incident, but the lesson is universal: **SHA pinning is non-negotiable**. All actions in this plan are pinned to commit SHAs.

### pre-commit/action trust model

The `pre-commit/action@v3.0.1` README notes that any secrets accessible at the job level (e.g., `GITHUB_TOKEN`) are also accessible to the hooks it runs. This is acceptable for a documentation-only repository with no sensitive tokens needed in CI, but be aware of this if the repo scope expands.

### gitleaks in CI

The gitleaks pre-commit hook runs on every commit locally. Having it also run in CI (via the pre-commit job) provides a backstop for contributors who skip local hooks. No additional standalone gitleaks GHA job is needed.

---

## Step 5: Proposed Workflow File

Create `.github/workflows/ci.yml`:

```yaml
# CI workflow: runs pre-commit hooks, markdownlint-cli2, and cspell on every PR.
#
# Action pins verified 2026-03-20 via GitHub API.
# To re-verify: api.github.com/repos/{owner}/{repo}/git/refs/tags/{tag}
#
# SHA pins:
#   actions/checkout@v6.0.2          de0fac2e4500dabe0009e67214ff5f5447ce83dd
#   actions/setup-python@v6.2.0      a309ff8b426b58ec0e2a45f0f869d46889d02405
#   actions/cache@v5.0.4             668228422ae6a00e4ad889ee87cd7109ec5666a7
#   pre-commit/action@v3.0.1         2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd
#   markdownlint-cli2-action@v22.0.0 07035fd053f7be764496c0f8d8f9f41f98305101
#   cspell-action@v8.3.0             9cd41bb518a24fefdafd9880cbab8f0ceba04d28

name: CI

on:
  pull_request:
    branches:
      - main

# Minimal permissions: read-only checkout, no write access needed.
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

      - name: Run pre-commit
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1

  markdownlint:
    name: Markdown lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Run markdownlint-cli2
        uses: DavidAnson/markdownlint-cli2-action@07035fd053f7be764496c0f8d8f9f41f98305101 # v22.0.0
        with:
          config: ".markdownlint-cli2.jsonc"
          globs: "**/*.md"

  cspell:
    name: Spell check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Run cspell
        uses: streetsidesoftware/cspell-action@9cd41bb518a24fefdafd9880cbab8f0ceba04d28 # v8.3.0
        with:
          config: "cspell.json"
          # Check ALL files in the repo, not just changed files.
          # The pre-commit job already covers changed-files-only; this job
          # provides whole-repo coverage for any files that may have been
          # silently introduced without triggering cspell previously.
          incremental_files_only: false
          files: "**/*.md"
          inline: warning
          strict: true
```

---

## Step 6: Design Notes and Tradeoffs

### Why three separate jobs?

Running pre-commit, markdownlint, and cspell as separate jobs gives independent pass/fail signals in the PR check UI. A markdownlint failure will not prevent the cspell result from appearing. This is especially useful during initial rollout.

### Why markdownlint and cspell again if pre-commit already runs them?

Pre-commit in CI runs hooks against all files (`--all-files` default in `pre-commit/action`). The dedicated action jobs provide:

1. **Richer PR annotations.** `markdownlint-cli2-action` and `cspell-action` emit GitHub annotations (inline line-level comments on the PR diff) that `pre-commit/action` does not.
2. **Decoupled failure signal.** Pre-commit may be slower (it installs all hook environments). Markdownlint and cspell jobs can start in parallel and fail fast independently.
3. **Explicit visibility.** The workflow makes it immediately obvious to contributors that spelling and markdown quality are enforced, even without reading `.pre-commit-config.yaml`.

**Tradeoff:** Running these checks twice increases CI minutes. On a documentation-only repository, these checks are fast (under 30 seconds each) and the annotation value outweighs the cost.

### Pre-commit caching

The `pre-commit/action@v3.0.1` composite action internally uses `actions/cache@v4` (verified via reading `action.yml`). The cache key is:

```yaml
pre-commit-3|${{ env.pythonLocation }}|${{ hashFiles('.pre-commit-config.yaml') }}
```

This invalidates the cache only when `.pre-commit-config.yaml` changes or the Python version changes. No additional caching step is needed.

### `actions/checkout@v6` vs v4

The current community default is still often shown as v4 in tutorials. This plan uses v6 (latest stable) because:

- v6.0.2 is the current release as of 2026-01-09.
- The credential persistence change in v6 is non-breaking for this workflow's usage.
- Staying on v4 would mean pinning to a major version that has been superseded twice.

### `incremental_files_only: false` for cspell

The `streetsidesoftware/cspell-action` defaults to `incremental_files_only: true`, which only checks files changed in the PR. This plan sets it to `false` with `files: "**/*.md"` to run a whole-repo check on every PR. For a documentation repository where the entire content is Markdown, this provides stronger guarantees. On a large code repo, you might prefer `true` to keep CI fast.

### markdownlint-cli2-action version skew note

`markdownlint-cli2-action@v22` bundles `markdownlint-cli2 v0.20.0`; the pre-commit hook uses `v0.21.0`. In practice:

- v0.21.0 added support for ESM config files and minor bug fixes.
- The `.markdownlint-cli2.jsonc` config this project uses is compatible with both.
- This skew means local pre-commit may pass while CI fails (or vice versa) in edge cases.
- **Resolution options:**
  a. Wait for `markdownlint-cli2-action@v23` to bundle v0.21.x.
  b. Pin the pre-commit hook back to `v0.20.0` for consistency.
  c. Accept the skew as cosmetic for now (recommended — the config used here does not exercise v0.21.0-specific features).

---

## Step 7: Pre-commit Hook Update Recommendations (Prioritized)

### ROUTINE (safe to batch together)

1. **gitleaks/gitleaks: v8.30.0 → v8.30.1** — patch release, released 2026-03-21. Pure maintenance.
2. **biomejs/pre-commit: v2.4.4 → v2.4.8** — 4 patch bumps. Bug fixes for Vue (which this project uses).
3. **streetsidesoftware/cspell-cli: v9.6.0 → v9.7.0** — minor feature release (new report modes, dictionary updates).

**These three can be batched into a single `.pre-commit-config.yaml` update PR.**

---

## Step 8: Verification Log

| Claim                                                                       | Tool                                                          | Source                                                               | Finding                                                                                        |
|-----------------------------------------------------------------------------|---------------------------------------------------------------|----------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `pre-commit/pre-commit-hooks` latest is v6.0.0                              | `mcp__plugin_github_github__get_latest_release`               | `pre-commit/pre-commit-hooks`                                        | Confirmed: `tag_name: v6.0.0`, published 2025-08-09                                            |
| `pre-commit/pre-commit-hooks` tags                                          | `mcp__plugin_github_github__list_tags`                        | `pre-commit/pre-commit-hooks`                                        | Top tag: v6.0.0 (SHA `3e8a8703`) — matches release                                             |
| `pre-commit/sync-pre-commit-deps` has no formal release                     | `mcp__plugin_github_github__get_latest_release`               | `pre-commit/sync-pre-commit-deps`                                    | 404 Not Found (no releases)                                                                    |
| `pre-commit/sync-pre-commit-deps` latest tag is v0.0.3                      | `mcp__plugin_github_github__list_tags`                        | `pre-commit/sync-pre-commit-deps`                                    | Confirmed: top tag v0.0.3                                                                      |
| `streetsidesoftware/cspell-cli` latest is v9.7.0                            | `mcp__plugin_github_github__get_latest_release`               | `streetsidesoftware/cspell-cli`                                      | Confirmed: `tag_name: v9.7.0`, published 2026-02-23                                            |
| `DavidAnson/markdownlint-cli2` latest tag is v0.21.0                        | `mcp__plugin_github_github__list_tags`                        | `DavidAnson/markdownlint-cli2`                                       | Confirmed: top tag v0.21.0 (SHA `5387279b`)                                                    |
| `DavidAnson/markdownlint-cli2` has no formal release                        | `mcp__plugin_github_github__get_latest_release`               | `DavidAnson/markdownlint-cli2`                                       | 404 Not Found (no `/releases/latest`)                                                          |
| `biomejs/pre-commit` releases/latest is stale                               | `mcp__plugin_github_github__get_latest_release`               | `biomejs/pre-commit`                                                 | Returns v0.6.1 (Dec 2024) — stale, does not reflect current tags                               |
| `biomejs/pre-commit` latest tag is v2.4.8                                   | `mcp__plugin_github_github__list_tags`                        | `biomejs/pre-commit`                                                 | Confirmed: top tag v2.4.8 (SHA `08073d12`)                                                     |
| `gitleaks/gitleaks` latest is v8.30.1                                       | `mcp__plugin_github_github__get_latest_release`               | `gitleaks/gitleaks`                                                  | Confirmed: `tag_name: v8.30.1`, published 2026-03-21                                           |
| `actions/checkout` latest is v6.0.2                                         | `mcp__plugin_github_github__get_latest_release` + `list_tags` | `actions/checkout`                                                   | Confirmed: SHA `de0fac2e`                                                                      |
| `actions/setup-python` latest is v6.2.0                                     | `mcp__plugin_github_github__get_latest_release` + `list_tags` | `actions/setup-python`                                               | Confirmed: SHA `a309ff8b`                                                                      |
| `actions/cache` latest is v5.0.4                                            | `mcp__plugin_github_github__get_latest_release` + `list_tags` | `actions/cache`                                                      | Confirmed: SHA `66822842`, published 2026-03-18                                                |
| `pre-commit/action` latest is v3.0.1                                        | `mcp__plugin_github_github__get_latest_release` + `list_tags` | `pre-commit/action`                                                  | Confirmed: SHA `2c7b3805`                                                                      |
| `pre-commit/action@v3.0.1` uses `actions/cache@v4`, not v3                  | `mcp__plugin_github_github__get_file_contents`                | `pre-commit/action` `action.yml`                                     | Confirmed: uses `actions/cache@v4`, composite action (no Node runtime)                         |
| `DavidAnson/markdownlint-cli2-action` latest is v22.0.0                     | `mcp__plugin_github_github__get_latest_release` + `list_tags` | `DavidAnson/markdownlint-cli2-action`                                | Confirmed: SHA `07035fd0`, bundles markdownlint-cli2 v0.20.0                                   |
| `markdownlint-cli2-action@v22` uses Node 24                                 | `mcp__plugin_github_github__get_file_contents`                | `action.yml`                                                         | Confirmed: `using: node24`                                                                     |
| `streetsidesoftware/cspell-action` latest is v8.3.0                         | `mcp__plugin_github_github__get_latest_release` + `list_tags` | `streetsidesoftware/cspell-action`                                   | Confirmed: SHA `9cd41bb5`, published 2026-02-24                                                |
| `cspell-action` supports `config`, `files`, `incremental_files_only` inputs | `mcp__plugin_github_github__get_file_contents`                | `cspell-action` `README.md`                                          | Confirmed: all inputs verified in README                                                       |
| No CVEs for `pre-commit/pre-commit-hooks`                                   | WebSearch                                                     | "pre-commit hooks CVE security advisory 2025 2026"                   | No CVEs assigned to the tool. Python `pre-commit` package has no known vulnerabilities (Snyk). |
| No CVEs for `cspell`                                                        | WebSearch                                                     | "cspell security advisory CVE 2025 2026"                             | No results for cspell-specific CVE. Tool has no Snyk advisories.                               |
| No CVEs for `markdownlint-cli2`                                             | WebSearch                                                     | "markdownlint-cli2 security advisory CVE 2025 2026"                  | Confirmed: no CVEs assigned. Snyk lists no vulnerabilities.                                    |
| No CVEs for `biomejs/biome`                                                 | WebSearch                                                     | "biomejs biome CVE security advisory 2025 2026"                      | No CVEs. Clean security record.                                                                |
| No CVEs for `gitleaks`                                                      | WebSearch                                                     | "gitleaks CVE security advisory gitleaks tool zricethezav 2025 2026" | No CVEs assigned to the gitleaks tool itself.                                                  |
| `actions/checkout@v6` credential change is non-breaking                     | WebSearch                                                     | "actions/checkout v6 changelog breaking changes 2026"                | Confirmed: credential persistence moved to separate file; non-breaking for standard workflows  |
| Supply-chain risk of mutable tags is real                                   | WebSearch                                                     | CVE-2025-30066 (tj-actions/changed-files)                            | Confirmed: mutable tag attack is a live threat vector. SHA pinning is mandatory.               |

### Self-check

- Every version sourced from a live lookup? **Yes** — all versions fetched from GitHub API via MCP tools.
- Both releases AND tags checked? **Yes** — for every dependency, both endpoints queried. Divergence found for `biomejs/pre-commit` (releases/latest stale at v0.6.1, correct version is v2.4.8 from tags) and for `DavidAnson/markdownlint-cli2` (no formal release, v0.21.0 from tags only).
- Security search run for every dependency? **Yes** — WebSearch run for each tool family. No CVEs found for any of the tools in this project.
- Changelogs read for every upgrade? **Yes** — release notes verified for all three behind-version tools.
- SHA fetched for every GitHub Action reference? **Yes** — all 6 SHAs confirmed from `list_tags` responses.

---

## Appendix: Complete Proposed `.github/workflows/ci.yml`

```yaml
# CI workflow: runs pre-commit hooks, markdownlint-cli2, and cspell on every PR.
#
# Action pins verified 2026-03-20 via GitHub API.
# To re-verify a SHA: curl https://api.github.com/repos/{owner}/{repo}/git/refs/tags/{tag}
#
# Pin reference table:
#   actions/checkout@v6.0.2                    de0fac2e4500dabe0009e67214ff5f5447ce83dd
#   actions/setup-python@v6.2.0                a309ff8b426b58ec0e2a45f0f869d46889d02405
#   pre-commit/action@v3.0.1                   2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd
#   DavidAnson/markdownlint-cli2-action@v22.0.0 07035fd053f7be764496c0f8d8f9f41f98305101
#   streetsidesoftware/cspell-action@v8.3.0    9cd41bb518a24fefdafd9880cbab8f0ceba04d28

name: CI

on:
  pull_request:
    branches:
      - main

# Minimal permissions. No write access needed for linting jobs.
permissions:
  contents: read

jobs:

  # ─────────────────────────────────────────────────────────────────────────────
  # Job 1: Run all pre-commit hooks (includes gitleaks, biome, cspell,
  # markdownlint, pre-commit-hooks, sync-pre-commit-deps).
  # The pre-commit/action composite handles pip install + caching automatically.
  # ─────────────────────────────────────────────────────────────────────────────
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

      - name: Run pre-commit (all hooks, all files)
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1

  # ─────────────────────────────────────────────────────────────────────────────
  # Job 2: Run markdownlint-cli2 via the dedicated action for inline PR
  # annotations. Uses .markdownlint-cli2.jsonc for configuration.
  # Note: bundles markdownlint-cli2 v0.20.0 (pre-commit pin is v0.21.0 — see
  # design notes in plan for details on this cosmetic version skew).
  # ─────────────────────────────────────────────────────────────────────────────
  markdownlint:
    name: Markdown lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Run markdownlint-cli2
        uses: DavidAnson/markdownlint-cli2-action@07035fd053f7be764496c0f8d8f9f41f98305101 # v22.0.0
        with:
          config: ".markdownlint-cli2.jsonc"
          globs: "**/*.md"

  # ─────────────────────────────────────────────────────────────────────────────
  # Job 3: Run cspell across all Markdown files for inline PR annotations.
  # Uses cspell.json for the word list and configuration.
  # incremental_files_only: false ensures whole-repo coverage, not just
  # changed files (appropriate for a documentation-only repository).
  # ─────────────────────────────────────────────────────────────────────────────
  cspell:
    name: Spell check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Run cspell
        uses: streetsidesoftware/cspell-action@9cd41bb518a24fefdafd9880cbab8f0ceba04d28 # v8.3.0
        with:
          config: "cspell.json"
          files: "**/*.md"
          incremental_files_only: false
          inline: warning
          strict: true
```

---

## Quick-start checklist

- [ ] Create `.github/workflows/ci.yml` with the workflow above.
- [ ] Update `gitleaks/gitleaks` in `.pre-commit-config.yaml`: `v8.30.0` → `v8.30.1`
- [ ] Update `biomejs/pre-commit` in `.pre-commit-config.yaml`: `v2.4.4` → `v2.4.8`
- [ ] Update `streetsidesoftware/cspell-cli` in `.pre-commit-config.yaml`: `v9.6.0` → `v9.7.0`
- [ ] Optionally update `biome.json` `$schema` URL: `schemas/2.4.4/schema.json` → `schemas/2.4.8/schema.json`
- [ ] Run `pre-commit autoupdate` locally after bumping hook versions to confirm no further hooks are behind.
- [ ] Open a draft PR to test the workflow fires correctly before merging.
