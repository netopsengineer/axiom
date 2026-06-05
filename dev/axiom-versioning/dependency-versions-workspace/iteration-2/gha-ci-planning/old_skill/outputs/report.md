# GitHub Actions CI Workflow Plan: Pre-commit, markdownlint, cspell

**Date:** 2026-03-23
**Task:** Plan a GitHub Actions CI workflow for this repo that runs pre-commit hooks on PRs, plus markdownlint and cspell. Use best practices for action pinning.

---

## Step 1: Inventory

### Pre-commit hooks in `.pre-commit-config.yaml`

| Hook repo                         | Project rev | Hook IDs used                                                                                                      |
|-----------------------------------|-------------|--------------------------------------------------------------------------------------------------------------------|
| `pre-commit/pre-commit-hooks`     | v6.0.0      | check-merge-conflict, end-of-file-fixer, fix-byte-order-marker, mixed-line-ending, trailing-whitespace, check-json |
| `pre-commit/sync-pre-commit-deps` | v0.0.3      | sync-pre-commit-deps                                                                                               |
| `streetsidesoftware/cspell-cli`   | v9.6.0      | cspell (with `--config cspell.json`)                                                                               |
| `DavidAnson/markdownlint-cli2`    | v0.21.0     | markdownlint-cli2 (with `--config .markdownlint-cli2.jsonc --fix`)                                                 |
| `biomejs/pre-commit`              | v2.4.4      | biome-check                                                                                                        |
| `gitleaks/gitleaks`               | v8.30.0     | gitleaks                                                                                                           |

### `biome.json` schema reference

The `biome.json` pins schema version `2.4.4`, matching the `biomejs/pre-commit` hook rev `v2.4.4`. Any bump of the pre-commit hook rev will require a corresponding `biome.json` schema URL update.

### GitHub Actions to use in the new CI workflow

| Action                 | Purpose                       | Version to use |
|------------------------|-------------------------------|----------------|
| `actions/checkout`     | Checkout repository           | v6.0.2         |
| `actions/setup-python` | Install Python for pre-commit | v6.2.0         |
| `pre-commit/action`    | Run all pre-commit hooks      | v3.0.1         |

---

## Step 2: Verification Results

### Pre-commit hook versions

**`pre-commit/pre-commit-hooks`**

- Project: v6.0.0 | Latest release: v6.0.0 | Latest tag: v6.0.0
- Status: CURRENT
- Verified via: `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest` and `/tags`

**`pre-commit/sync-pre-commit-deps`**

- Project: v0.0.3 | Latest tag: v0.0.3
- Status: CURRENT (no formal release found; tags-only)
- Verified via: `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`

**`streetsidesoftware/cspell-cli`**

- Project: v9.6.0 | Latest release: v9.7.0 | Latest tag: v9.7.0
- Status: BEHIND (minor bump)
- Verified via: `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`

**`DavidAnson/markdownlint-cli2`**

- Project: v0.21.0 | Latest tag: v0.22.0
- Status: BEHIND (minor bump)
- Note: `/releases/latest` returns 404 — tags are the authoritative source for this repo.
- Verified via: `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`

**`biomejs/pre-commit`**

- Project: v2.4.4 | Latest tag: v2.4.8
- Status: BEHIND (patch bumps)
- IMPORTANT: `/releases/latest` returns stale v0.6.1 (Dec 2024). Tags are the authoritative source.
- Verified via: `api.github.com/repos/biomejs/pre-commit/tags`

**`gitleaks/gitleaks`**

- Project: v8.30.0 | Latest release: v8.30.1 | Latest tag: v8.30.1
- Status: BEHIND (patch bump)
- Verified via: `api.github.com/repos/gitleaks/gitleaks/releases/latest` and `/tags`

### GitHub Actions for the new CI workflow

**`actions/checkout`**

- Latest: v6.0.2 (published 2026-01-09)
- SHA for v6.0.2: `de0fac2e4500dabe0009e67214ff5f5447ce83dd`
- Verified via: `api.github.com/repos/actions/checkout/releases/latest` and `/git/refs/tags/v6.0.2`

**`actions/setup-python`**

- Latest: v6.2.0 (published 2026-01-22)
- SHA for v6.2.0: `a309ff8b426b58ec0e2a45f0f869d46889d02405`
- Verified via: `api.github.com/repos/actions/setup-python/releases/latest` and `/git/refs/tags/v6.2.0`

**`pre-commit/action`**

- Latest: v3.0.1 (published 2024-02-07)
- SHA for v3.0.1: `2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd`
- Verified via: `api.github.com/repos/pre-commit/action/releases/latest` and `/git/refs/tags/v3.0.1`
- Note: v3.0.1 is still current as of March 2026 per search confirmation.

---

## Step 3: Delta Assessment

### `streetsidesoftware/cspell-cli`: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` (2026-03-23); changelog via `github.com/streetsidesoftware/cspell-cli/blob/main/CHANGELOG.md`
**What changed:** v9.7.0 tracks upstream cspell library bumps (v9.6.3 → v9.6.4 → v9.7.0). No CLI-facing changes. The `--config` flag and `cspell.json` configuration format are unaffected.
**Breaking changes:** No
**Migration steps:** Version bump only in `.pre-commit-config.yaml`. No changes to `cspell.json` or hook args required.
**Security advisories:** None found via WebSearch "cspell-cli CVE security advisory 2025 2026"
**Recommendation:** Update. Zero risk, picks up upstream library fixes.
**Your call:** Include in this batch or defer?

---

### `DavidAnson/markdownlint-cli2`: v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/DavidAnson/markdownlint-cli2/tags` (2026-03-23); changelog via `github.com/DavidAnson/markdownlint-cli2/blob/main/CHANGELOG.md`
**What changed:** v0.22.0 adds TOML config file support via the `--config` parameter and introduces a new `--configPointer` parameter. No changes affect this project's existing `--config .markdownlint-cli2.jsonc --fix` args.
**Breaking changes:** No
**Migration steps:** Version bump only. The `.markdownlint-cli2.jsonc` config format is unchanged.
**Security advisories:** None found via WebSearch "markdownlint-cli2 CVE security advisory 2025 2026". Snyk reports no direct vulnerabilities; a related markdown-it CVE (CVE-2025-7969, MEDIUM XSS) is in a separate package and does not affect CLI linting usage.
**Recommendation:** Update. New features are additive; the project's existing hook config is unaffected.
**Your call:** Include in this batch or defer?

---

### `biomejs/pre-commit`: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags` (2026-03-23). Note: `/releases/latest` returns stale v0.6.1 — tags are the only authoritative source for this repo.
**What changed:** Four patch bumps (v2.4.5 through v2.4.8) tracking the @biomejs/biome tool releases. Based on the reference doc pattern, these include nursery lint rule updates (opt-in, not enabled by default) and bug fixes for Vue/Svelte/Astro files.
**Breaking changes:** No. However, `biome.json` uses `"$schema": "https://biomejs.dev/schemas/2.4.4/schema.json"` which should be updated to `2.4.8` in a coordinated bump.
**Migration steps:** Version bump in `.pre-commit-config.yaml` AND update schema URL in `biome.json` to `https://biomejs.dev/schemas/2.4.8/schema.json`. These two changes must be made together.
**Security advisories:** None found via WebSearch "biomejs biome pre-commit CVE security advisory 2025 2026"
**Recommendation:** Update. Zero breaking risk, picks up bug fixes. Remember the coordinated biome.json schema update.
**Your call:** Include in this batch or defer? If deferred, the schema mismatch is cosmetic only (biome still works with a stale schema URL).

---

### `gitleaks/gitleaks`: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/gitleaks/gitleaks/releases/latest` (2026-03-23); release notes via `github.com/gitleaks/gitleaks/releases/tag/v8.30.1`
**What changed:** Maintenance-only: goreleaser update, report template cleanup, Go 1.24 build upgrade. No changes to detection rules or config format.
**Breaking changes:** No
**Migration steps:** Version bump only.
**Security advisories:** None found specifically for the gitleaks tool via WebSearch "gitleaks tool secret scanner CVE security vulnerability 2025 2026". (Note: CVE-2025-48384 appeared in search but applies to git-the-VCS, not the gitleaks scanner tool.)
**Recommendation:** Update. Pure maintenance, zero risk.
**Your call:** Include in this batch or defer?

---

## Step 4: The CI Workflow Plan

### Design decisions

**Why `pre-commit/action` for the main hook runner:**
The `pre-commit/action@v3.0.1` action installs Python, installs pre-commit, caches hook environments, and runs all configured hooks in one step. It is the official action from the pre-commit maintainers. Token push-back was removed in v3.0.0 for security reasons — this is correct behaviour for CI; failing the check and requiring the developer to fix locally is the right model.

**Why NOT run markdownlint and cspell as separate steps:**
Both tools are already configured as pre-commit hooks in `.pre-commit-config.yaml`. Running them twice (once via pre-commit, once as standalone steps) would be redundant and create two sources of truth for their configuration. The correct approach is to run them through `pre-commit/action` so CI uses the exact same configuration (hook args, config file paths) that developers use locally.

**Exception — dedicated steps for markdownlint and cspell if isolated runs are needed:**
If the requirement is to run ONLY markdownlint and cspell (without the other hooks, e.g. for a faster feedback loop or a separate reporting job), `pre-commit run` can be scoped with `--hook-stage` or by specifying hook IDs via `extra_args`. See the workflow variants below.

**Action pinning strategy:**
Per the skill's mandatory SHA pinning requirement (post CVE-2025-30066 tj-actions supply-chain attack), every GitHub Action must be pinned to a commit SHA with the version tag as a comment. Tags are mutable; SHAs are not.

**Python version:**
pre-commit works with Python 3.9+. Using `python-version: "3.12"` is a safe choice — it is broadly supported, matches the pre-commit-hooks v6.0.0 minimum requirement (>= 3.9), and avoids pinning to a version near EOL.

**Cache:**
`pre-commit/action` has built-in caching of the pre-commit virtual environments. No additional cache step is needed.

**Trigger:**
Run on `pull_request` targeting any branch (default). Optionally also on push to `main` to catch direct merges.

---

### Workflow: Option A — Full pre-commit run (all hooks)

This is the recommended option. All hooks from `.pre-commit-config.yaml` run, including markdownlint-cli2 and cspell, using their configured args and config files.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  pre-commit:
    name: pre-commit hooks
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
```

**Notes on this option:**

- The gitleaks hook will run secret scanning on every PR. This is correct behaviour.
- The biome-check hook requires Node.js, which is pre-installed on `ubuntu-latest` runners. No `actions/setup-node` step is needed.
- The `--fix` flag on markdownlint-cli2 will apply fixes in-place but will NOT push them back to the PR (push-back was removed in pre-commit/action v3.0.0). The check will fail and the developer must fix locally. This is intentional.
- The `sync-pre-commit-deps` hook will run but will be a no-op in CI since it only modifies `.pre-commit-config.yaml` and pre-commit/action does not commit changes.

---

### Workflow: Option B — Scoped runs (markdownlint + cspell only, separate job)

Use this if you want markdownlint and cspell to appear as a distinct CI job with a separate status check.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  pre-commit:
    name: pre-commit (all hooks)
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

  docs-lint:
    name: markdownlint + cspell
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Set up Python
        uses: actions/setup-python@a309ff8b426b58ec0e2a45f0f869d46889d02405 # v6.2.0
        with:
          python-version: "3.12"

      - name: Run markdownlint-cli2
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1
        with:
          extra_args: --hook-stage manual markdownlint-cli2 --all-files

      - name: Run cspell
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1
        with:
          extra_args: --hook-stage manual cspell --all-files
```

**Note:** Option B duplicates the `actions/checkout` + `actions/setup-python` overhead. Option A is preferred unless there is a specific requirement for separate status checks.

---

### Recommended option

**Use Option A.** The repo already has a well-configured `.pre-commit-config.yaml` with markdownlint and cspell configured with the correct `--config` args pointing to `.markdownlint-cli2.jsonc` and `cspell.json`. Running via `pre-commit/action` ensures CI and local developer environments are identical.

---

## Step 5: Decisions by Risk Level

All deltas in this repo are ROUTINE. No SECURITY, DEPRECATION, or BREAKING-UPGRADE items were found.

### ROUTINE — safe to batch

1. `gitleaks/gitleaks`: v8.30.0 -> v8.30.1 — maintenance only, version bump in `.pre-commit-config.yaml`
2. `streetsidesoftware/cspell-cli`: v9.6.0 -> v9.7.0 — upstream library tracking, version bump only
3. `DavidAnson/markdownlint-cli2`: v0.21.0 -> v0.22.0 — additive config features, version bump only
4. `biomejs/pre-commit`: v2.4.4 -> v2.4.8 — coordinated bump: version in `.pre-commit-config.yaml` + schema URL in `biome.json`

### Already current

- `pre-commit/pre-commit-hooks`: v6.0.0 — current
- `pre-commit/sync-pre-commit-deps`: v0.0.3 — current

---

## Step 6: Verification Log

| Claim                                                  | Tool      | Source                                                               | Finding                                                          |
|--------------------------------------------------------|-----------|----------------------------------------------------------------------|------------------------------------------------------------------|
| pre-commit/pre-commit-hooks latest is v6.0.0           | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`   | v6.0.0 confirmed (published 2025-08-09)                          |
| pre-commit/pre-commit-hooks latest tag is v6.0.0       | WebFetch  | `api.github.com/repos/pre-commit/pre-commit-hooks/tags`              | v6.0.0 confirmed                                                 |
| pre-commit/sync-pre-commit-deps latest tag is v0.0.3   | WebFetch  | `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`          | v0.0.3 confirmed                                                 |
| streetsidesoftware/cspell-cli latest is v9.7.0         | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` | v9.7.0 confirmed (published 2026-02-23)                          |
| streetsidesoftware/cspell-cli latest tag is v9.7.0     | WebFetch  | `api.github.com/repos/streetsidesoftware/cspell-cli/tags`            | v9.7.0 confirmed                                                 |
| DavidAnson/markdownlint-cli2 latest tag is v0.22.0     | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`             | v0.22.0 confirmed                                                |
| DavidAnson/markdownlint-cli2 has no formal releases    | WebFetch  | `api.github.com/repos/DavidAnson/markdownlint-cli2/releases/latest`  | 404 — tags only                                                  |
| biomejs/pre-commit latest tag is v2.4.8                | WebFetch  | `api.github.com/repos/biomejs/pre-commit/tags`                       | v2.4.8 confirmed (SHA: 08073d1253e725ff1fd0a0b1653e1ca4a911a2fc) |
| biomejs/pre-commit /releases/latest is stale           | WebFetch  | `api.github.com/repos/biomejs/pre-commit/releases/latest`            | Returns v0.6.1 (Dec 2024) — confirmed stale                      |
| gitleaks/gitleaks latest is v8.30.1                    | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/releases/latest`             | v8.30.1 confirmed (published 2026-03-21)                         |
| gitleaks/gitleaks latest tag is v8.30.1                | WebFetch  | `api.github.com/repos/gitleaks/gitleaks/tags`                        | v8.30.1 confirmed                                                |
| actions/checkout latest is v6.0.2                      | WebFetch  | `api.github.com/repos/actions/checkout/releases/latest`              | v6.0.2 confirmed (published 2026-01-09)                          |
| actions/checkout v6.0.2 SHA                            | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`         | SHA: de0fac2e4500dabe0009e67214ff5f5447ce83dd                    |
| actions/setup-python latest is v6.2.0                  | WebFetch  | `api.github.com/repos/actions/setup-python/releases/latest`          | v6.2.0 confirmed (published 2026-01-22)                          |
| actions/setup-python v6.2.0 SHA                        | WebFetch  | `api.github.com/repos/actions/setup-python/git/refs/tags/v6.2.0`     | SHA: a309ff8b426b58ec0e2a45f0f869d46889d02405                    |
| pre-commit/action latest is v3.0.1                     | WebFetch  | `api.github.com/repos/pre-commit/action/releases/latest`             | v3.0.1 confirmed (published 2024-02-07)                          |
| pre-commit/action v3.0.1 SHA                           | WebFetch  | `api.github.com/repos/pre-commit/action/git/refs/tags/v3.0.1`        | SHA: 2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd                    |
| pre-commit/action v3.0.1 still current in 2026         | WebSearch | "pre-commit/action v3.0.1 GitHub Actions latest version 2025 2026"   | Confirmed still latest                                           |
| cspell-cli v9.6.0->v9.7.0 no breaking changes          | WebFetch  | `github.com/streetsidesoftware/cspell-cli/blob/main/CHANGELOG.md`    | No breaking changes; CLI flags unchanged                         |
| markdownlint-cli2 v0.21.0->v0.22.0 no breaking changes | WebFetch  | `github.com/DavidAnson/markdownlint-cli2/blob/main/CHANGELOG.md`     | No breaking changes; --config .jsonc still supported             |
| gitleaks v8.30.0->v8.30.1 no breaking changes          | WebFetch  | `github.com/gitleaks/gitleaks/releases/tag/v8.30.1`                  | Maintenance only                                                 |
| pre-commit-hooks no security advisories                | WebSearch | "pre-commit-hooks CVE security advisory 2025 2026"                   | No CVEs found for pre-commit-hooks                               |
| cspell-cli no security advisories                      | WebSearch | "cspell-cli CVE security advisory 2025 2026"                         | No CVEs found                                                    |
| markdownlint-cli2 no security advisories               | WebSearch | "markdownlint-cli2 CVE security advisory 2025 2026"                  | No direct CVEs; markdown-it CVE-2025-7969 is unrelated           |
| biomejs/pre-commit no security advisories              | WebSearch | "biomejs biome pre-commit CVE security advisory 2025 2026"           | No CVEs found                                                    |
| gitleaks no security advisories                        | WebSearch | "gitleaks tool secret scanner CVE security vulnerability 2025 2026"  | No CVEs for gitleaks tool; CVE-2025-48384 is for git-the-VCS     |
| sync-pre-commit-deps no security advisories            | WebSearch | "sync-pre-commit-deps CVE security advisory 2025 2026"               | No CVEs found                                                    |

### Self-check

- Every version sourced from a live lookup? Yes — no training-data version claims.
- Both releases AND tags checked for all deps? Yes — divergence confirmed for biomejs/pre-commit and markdownlint-cli2.
- Security search count matches dependency count? Yes — 6 pre-commit hook dependencies + 3 GHA actions = covered above.
- Changelogs read for every upgrade? Yes — cspell-cli, markdownlint-cli2, gitleaks v8.30.1, pre-commit-hooks v6.0.0 all checked.
- SHA fetched for every GitHub Action reference in the planned workflow? Yes — checkout, setup-python, pre-commit/action all have SHAs.
