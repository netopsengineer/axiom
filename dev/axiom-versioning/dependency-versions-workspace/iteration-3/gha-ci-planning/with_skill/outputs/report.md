# GHA CI Workflow Plan: Pre-Commit, Markdownlint, and CSpell

**Task:** Plan a GitHub Actions CI workflow for this repo that runs pre-commit hooks on PRs, plus markdownlint and cspell. Use best practices for action pinning.

**Date verified:** 2026-03-23

---

## Step 1: Inventory

### Project files examined

- `.pre-commit-config.yaml` — defines all hooks run locally
- `biome.json` — Biome schema pins to `2.4.4`

### Pre-commit hooks in `.pre-commit-config.yaml`

| Hook repo                         | Current rev | Role                  |
|-----------------------------------|-------------|-----------------------|
| `pre-commit/pre-commit-hooks`     | `v6.0.0`    | General file hygiene  |
| `pre-commit/sync-pre-commit-deps` | `v0.0.3`    | Syncs transitive deps |
| `streetsidesoftware/cspell-cli`   | `v9.6.0`    | Spell checking        |
| `DavidAnson/markdownlint-cli2`    | `v0.21.0`   | Markdown linting      |
| `biomejs/pre-commit`              | `v2.4.4`    | Biome lint + format   |
| `gitleaks/gitleaks`               | `v8.30.0`   | Secret scanning       |

### Architectural note

Both `markdownlint-cli2` and `cspell` are already defined as pre-commit hooks. The CI workflow has two valid approaches:

**Option A (recommended):** Use `pre-commit/action` only. This runs all hooks — including markdownlint and cspell — from the same source of truth as the local developer experience. No duplication.

**Option B:** Use `pre-commit/action` for general hooks, plus separate `DavidAnson/markdownlint-cli2-action` and `streetsidesoftware/cspell-action` steps for standalone execution.

**Important finding for Option B:** The latest `markdownlint-cli2-action@v22.0.0` (Dec 2025) bundles `markdownlint-cli2 v0.20.0` — which is **older** than the `v0.21.0` already pinned in the pre-commit config. Using the dedicated action would run a version downgrade compared to local hooks. For a documentation-focused repo, this discrepancy would cause different lint results between local and CI. Option A avoids this entirely.

This plan presents both options. Option A is the recommended default. Option B is documented for cases where separate, parallelizable CI steps are preferred and the version gap is acceptable.

---

## Step 2: Version Verification

### GitHub Actions required

| Action                                | Verified current | Source                                                 |
|---------------------------------------|------------------|--------------------------------------------------------|
| `actions/checkout`                    | `v6.0.2`         | `/releases/latest` AND `/tags`                         |
| `actions/setup-python`                | `v6.2.0`         | `/releases/latest` AND `/tags`                         |
| `pre-commit/action`                   | `v3.0.1`         | `/releases/latest` AND `/tags`                         |
| `DavidAnson/markdownlint-cli2-action` | `v22.0.0`        | releases list (note: independent versioning from cli2) |
| `streetsidesoftware/cspell-action`    | `v8.3.0`         | `/releases/latest` AND `/tags`                         |

### Pre-commit hook versions

| Hook                              | In config | Current   | Delta            |
|-----------------------------------|-----------|-----------|------------------|
| `pre-commit/pre-commit-hooks`     | `v6.0.0`  | `v6.0.0`  | Current          |
| `pre-commit/sync-pre-commit-deps` | `v0.0.3`  | `v0.0.3`  | Current          |
| `streetsidesoftware/cspell-cli`   | `v9.6.0`  | `v9.7.0`  | 1 minor behind   |
| `DavidAnson/markdownlint-cli2`    | `v0.21.0` | `v0.22.0` | 1 minor behind   |
| `biomejs/pre-commit`              | `v2.4.4`  | `v2.4.8`  | 4 patches behind |
| `gitleaks/gitleaks`               | `v8.30.0` | `v8.30.1` | 1 patch behind   |

---

## Step 3: Findings

### actions/checkout: N/A (new dependency for CI)

**Risk level:** ROUTINE (new addition)
**Verified via:** WebFetch `api.github.com/repos/actions/checkout/releases/latest` and `/tags` — both return `v6.0.2` (Jan 9, 2026)
**SHA:** `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (direct commit, no resolution needed)
**Security advisories:** CVE-2025-61671 documents a critical (CVSS 9.3) misuse pattern: checking out PR head code under `pull_request_target`. This CI workflow uses `pull_request` (not `pull_request_target`), so it runs with the PR branch code and no elevated secrets — not vulnerable to this pattern. The March 2026 `aquasecurity/trivy-action` supply chain attack further demonstrates why SHA pinning is mandatory. No CVE assigned to `actions/checkout` itself.
**Recommendation:** Pin to SHA. Use `pull_request` trigger only, never `pull_request_target` for this workflow.
**Your call:** Include as pinned dependency.

---

### actions/setup-python: N/A (new dependency for CI)

**Risk level:** ROUTINE (new addition)
**Verified via:** WebFetch `api.github.com/repos/actions/setup-python/releases/latest` — `v6.2.0` (Jan 22, 2026). Tags confirm same.
**SHA:** `a309ff8b426b58ec0e2a45f0f869d46889d02405` (direct commit)
**Security advisories:** No CVE found for `actions/setup-python` itself via "actions/setup-python CVE 2025 2026". GlassWorm (March 2026) targets Python repos via stolen GitHub tokens but is not specific to setup-python.
**Recommendation:** Pin to SHA. Required to install Python for pre-commit.
**Your call:** Include as pinned dependency.

---

### pre-commit/action: N/A (new dependency for CI)

**Risk level:** ROUTINE (new addition)
**Verified via:** WebFetch `api.github.com/repos/pre-commit/action/releases/latest` and `/tags` — both return `v3.0.1` (Feb 7, 2024)
**SHA:** `2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd` (direct commit)
**What changed:** `v3.0.0` removed the `token` push-back feature as a security fix — the token was accessible as `$INPUT_TOKEN` to hook scripts, which could expose secrets to unvetted code. `v3.0.1` is a patch on top of that.
**Security advisories:** No CVE assigned to `pre-commit/action` itself. CVE-2025-30066 (`tj-actions/changed-files`) is the supply-chain precedent reinforcing SHA pinning for all actions.
**Recommendation:** Pin to SHA. Cleanest way to run all pre-commit hooks in CI with the same config as local development.
**Your call:** Include as pinned dependency.

---

### DavidAnson/markdownlint-cli2-action: N/A (optional, see architectural note)

**Risk level:** ROUTINE (if included)
**Verified via:** Bash `gh api repos/DavidAnson/markdownlint-cli2-action/releases` — `v22.0.0` (Dec 9, 2025). Tags confirm.
**SHA:** `07035fd053f7be764496c0f8d8f9f41f98305101` (direct commit)
**Versioning divergence:** The action's version scheme is INDEPENDENT from `markdownlint-cli2`'s package version. `markdownlint-cli2-action@v22.0.0` bundles `markdownlint-cli2 v0.20.0` + `markdownlint v0.40.0`. The pre-commit config already pins `markdownlint-cli2 v0.21.0`, which is newer. Using this action in CI creates a version split — CI would use v0.20.0 while local dev uses v0.21.0.
**Security advisories:** No CVE found for markdownlint-cli2 or this action via "markdownlint-cli2 DavidAnson CVE security advisory 2025 2026".
**Recommendation:** Only include (Option B) if you want separate job parallelism and accept the version split. Under Option A, skip this action — markdownlint runs through `pre-commit/action` at the pre-commit config version.
**Your call:** Include only under Option B. Requires accepting the version split or updating the pre-commit hook to match.

---

### streetsidesoftware/cspell-action: N/A (optional, see architectural note)

**Risk level:** ROUTINE (if included)
**Verified via:** WebFetch `api.github.com/repos/streetsidesoftware/cspell-action/releases/latest` and `/tags` — both return `v8.3.0` (Feb 24, 2026)
**SHA:** `9cd41bb518a24fefdafd9880cbab8f0ceba04d28` (direct commit)
**Security advisories:** CVE-2026-25931 (GHSA-mggq-68mr-58vj) affects the `vscode-spell-checker` VS Code extension, NOT the `cspell-action` or `cspell-cli` CLI tool. Not relevant to CI usage. No CVE found for `cspell-action` or `cspell-cli` itself.
**Recommendation:** Only include (Option B) for standalone cspell CI steps. Under Option A, cspell runs through `pre-commit/action`.
**Your call:** Include only under Option B.

---

### Pre-commit hook deltas (context for .pre-commit-config.yaml — relevant because CI runs these)

These are in-scope because the CI workflow executes the pre-commit config. Stale hook versions run in CI.

#### streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest` — `v9.7.0` (Feb 23, 2026). Tags confirm.
**What changed:** v9.7.0 primarily bumps the underlying CSpell dependency to 9.7.0. Patch releases 9.6.3 and 9.6.4 were maintenance-only.
**Breaking changes:** No. Changelog confirms no breaking changes between v9.6.0 and v9.7.0.
**Migration steps:** Version bump only in `.pre-commit-config.yaml`: `rev: v9.7.0`
**Security advisories:** None found via "cspell streetsidesoftware CVE security advisory 2025 2026". CVE-2026-25931 is scoped to the VS Code extension, not cspell-cli.
**Recommendation:** Routine bump. No risk.
**Your call:** Include in next update batch.

---

#### DavidAnson/markdownlint-cli2: v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/DavidAnson/markdownlint-cli2/tags` — `v0.22.0` is latest. Note: `/releases/latest` returns 404 — this is a tags-only repo; always use `/tags` for this project.
**What changed:** Added TOML config file format support, new `--configPointer` parameter, made `--config` more flexible. Removed the deprecated `markdownlint-cli2-config` and `markdownlint-cli2-fix` entry points.
**Breaking changes:** The pre-commit config uses `id: markdownlint-cli2` with `args: ["--config", ".markdownlint-cli2.jsonc", "--fix"]` — this uses the main entry point with flags, not the removed entry points. No breaking change for this project's usage.
**Migration steps:** Version bump only in `.pre-commit-config.yaml`: `rev: v0.22.0`
**Security advisories:** None found via "markdownlint-cli2 DavidAnson CVE security advisory 2025 2026".
**Recommendation:** Safe to bump. Removed entry points are not used by this project.
**Your call:** Include in next update batch.

---

#### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags` — `v2.4.8` is latest (Mar 19, 2026). Note: `/releases/latest` returns stale `v0.6.1` (Dec 2024) — tags are the ONLY authoritative source for this repo.
**What changed:** 4 patch bumps tracking `@biomejs/biome`. The `biome.json` in this repo pins `"$schema": "https://biomejs.dev/schemas/2.4.4/schema.json"` — the schema URL must be updated to match.
**Breaking changes:** No. Only biome package bumps and nursery rule additions (opt-in, not enabled by default). Bug fixes for Vue/Svelte/Astro handling.
**Migration steps:** Two changes required together: (1) `rev: v2.4.8` in `.pre-commit-config.yaml`; (2) `"$schema": "https://biomejs.dev/schemas/2.4.8/schema.json"` in `biome.json`. Must move together.
**Security advisories:** None found via "biomejs biome CVE 2025 2026".
**Recommendation:** Update. Zero risk. The biome.json schema bump is required for consistency.
**Your call:** Include in next update batch. Must update both files together.

---

#### gitleaks/gitleaks: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/gitleaks/gitleaks/releases/latest` — `v8.30.1` (Mar 21, 2026). Tags confirm.
**What changed:** Patch release, rule updates and bug fixes.
**Breaking changes:** No.
**Migration steps:** Version bump only in `.pre-commit-config.yaml`: `rev: v8.30.1`
**Security advisories:** No CVE found for the gitleaks tool itself via "gitleaks tool zricethezav security advisory CVE 2025 2026". Note: the original author has started a successor project called Betterleaks; `gitleaks/gitleaks` remains actively maintained.
**Recommendation:** Routine bump.
**Your call:** Include in next update batch.

---

## Step 4: Proposed CI Workflow

### Option A (recommended): All linting via pre-commit

A single `pre-commit/action` step runs all hooks from `.pre-commit-config.yaml`, including markdownlint-cli2 and cspell, with the exact versions configured for local development. One source of truth.

```yaml
# .github/workflows/ci.yml
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
          python-version: "3.x"

      - name: Run pre-commit
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1
```

This runs all configured hooks: `check-merge-conflict`, `end-of-file-fixer`, `fix-byte-order-marker`, `mixed-line-ending`, `trailing-whitespace`, `check-json`, `sync-pre-commit-deps`, `cspell`, `markdownlint-cli2`, `biome-check`, and `gitleaks`.

**Note on `sync-pre-commit-deps`:** This hook updates transitive dependencies in `.pre-commit-config.yaml`. In CI with a read-only checkout, it will fail if the config is out of sync. Ensure the config is committed with up-to-date deps, or skip this hook in CI:

```yaml
      - name: Run pre-commit
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1
        env:
          SKIP: sync-pre-commit-deps
```

---

### Option B: Parallel jobs with dedicated actions

Splits hooks into parallel jobs. Useful when you want separate check statuses or faster wall-clock time on large repos. Tradeoffs noted.

**Tradeoff:** `markdownlint-cli2-action@v22.0.0` bundles cli2 `v0.20.0`, which is older than the `v0.21.0` in the pre-commit config. Local dev and CI will run different markdownlint-cli2 versions.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: ["**"]

permissions:
  contents: read

jobs:
  pre-commit:
    name: Pre-commit hooks (excluding markdownlint and cspell)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Set up Python
        uses: actions/setup-python@a309ff8b426b58ec0e2a45f0f869d46889d02405 # v6.2.0
        with:
          python-version: "3.x"

      - name: Run pre-commit (skip markdownlint and cspell)
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1
        env:
          SKIP: cspell,markdownlint-cli2

  markdownlint:
    name: Markdownlint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Run markdownlint-cli2
        # NOTE: This action bundles markdownlint-cli2 v0.20.0.
        # The pre-commit config uses v0.21.0. Versions diverge — see report.
        uses: DavidAnson/markdownlint-cli2-action@07035fd053f7be764496c0f8d8f9f41f98305101 # v22.0.0
        with:
          config: ".markdownlint-cli2.jsonc"
          globs: "**/*.md"

  cspell:
    name: CSpell
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Run cspell
        uses: streetsidesoftware/cspell-action@9cd41bb518a24fefdafd9880cbab8f0ceba04d28 # v8.3.0
        with:
          config: "cspell.json"
```

---

## Step 5: Decision Summary (by risk level)

No SECURITY or DEPRECATION findings for any dependency in this plan.

### ROUTINE — Pre-commit hook bumps (safe to batch)

1. `gitleaks/gitleaks`: v8.30.0 -> v8.30.1 (patch, version bump only)
2. `streetsidesoftware/cspell-cli`: v9.6.0 -> v9.7.0 (minor, no breaking changes)
3. `DavidAnson/markdownlint-cli2`: v0.21.0 -> v0.22.0 (minor, removed deprecated entry points not used by this project)
4. `biomejs/pre-commit`: v2.4.4 -> v2.4.8 (4 patches, must also update `biome.json` schema URL)

### Architectural decision (required before shipping CI)

1. **Option A vs Option B:** Choose whether markdownlint and cspell run via `pre-commit/action` (Option A, recommended) or via dedicated action steps (Option B). Option B requires accepting or resolving the markdownlint-cli2 version split (action bundles v0.20.0, pre-commit config uses v0.21.0).

---

## Step 6: Verification Log

| Claim                                                  | Tool                               | Source                                                                           | Finding                                                                                                           |
|--------------------------------------------------------|------------------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `actions/checkout` latest is `v6.0.2`                  | WebFetch                           | `api.github.com/repos/actions/checkout/releases/latest`                          | Confirmed `v6.0.2`, Jan 9 2026                                                                                    |
| `actions/checkout` tags agree                          | WebFetch                           | `api.github.com/repos/actions/checkout/tags`                                     | Top tag: `v6.0.2`                                                                                                 |
| `actions/checkout@v6.0.2` commit SHA                   | WebFetch                           | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                     | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (direct commit)                                                        |
| `actions/setup-python` latest is `v6.2.0`              | WebFetch                           | `api.github.com/repos/actions/setup-python/releases/latest`                      | Confirmed `v6.2.0`, Jan 22 2026                                                                                   |
| `actions/setup-python` tags agree                      | WebFetch                           | `api.github.com/repos/actions/setup-python/tags`                                 | Top tag: `v6.2.0`                                                                                                 |
| `actions/setup-python@v6.2.0` commit SHA               | WebFetch                           | `api.github.com/repos/actions/setup-python/git/refs/tags/v6.2.0`                 | `a309ff8b426b58ec0e2a45f0f869d46889d02405` (direct commit)                                                        |
| `pre-commit/action` latest is `v3.0.1`                 | WebFetch                           | `api.github.com/repos/pre-commit/action/releases/latest`                         | Confirmed `v3.0.1`, Feb 7 2024                                                                                    |
| `pre-commit/action` tags agree                         | WebFetch                           | `api.github.com/repos/pre-commit/action/tags`                                    | Top tag: `v3.0.1`                                                                                                 |
| `pre-commit/action@v3.0.1` commit SHA                  | WebFetch                           | `api.github.com/repos/pre-commit/action/git/refs/tags/v3.0.1`                    | `2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd` (direct commit)                                                        |
| `markdownlint-cli2-action` latest is `v22.0.0`         | Bash (gh api)                      | `api.github.com/repos/DavidAnson/markdownlint-cli2-action/releases`              | Confirmed `v22.0.0`, Dec 9 2025; bundles cli2 v0.20.0                                                             |
| `markdownlint-cli2-action` tags agree                  | WebFetch                           | `api.github.com/repos/DavidAnson/markdownlint-cli2-action/tags`                  | Top tag: `v22.0.0`                                                                                                |
| `markdownlint-cli2-action@v22.0.0` commit SHA          | WebFetch                           | `api.github.com/repos/DavidAnson/markdownlint-cli2-action/git/refs/tags/v22.0.0` | `07035fd053f7be764496c0f8d8f9f41f98305101` (direct commit)                                                        |
| `cspell-action` latest is `v8.3.0`                     | WebFetch                           | `api.github.com/repos/streetsidesoftware/cspell-action/releases/latest`          | Confirmed `v8.3.0`, Feb 24 2026                                                                                   |
| `cspell-action` tags agree                             | WebFetch                           | `api.github.com/repos/streetsidesoftware/cspell-action/tags`                     | Top tag: `v8.3.0`                                                                                                 |
| `cspell-action@v8.3.0` commit SHA                      | WebFetch                           | `api.github.com/repos/streetsidesoftware/cspell-action/git/refs/tags/v8.3.0`     | `9cd41bb518a24fefdafd9880cbab8f0ceba04d28` (direct commit)                                                        |
| `pre-commit-hooks` latest is `v6.0.0`                  | WebFetch + Bash                    | releases/latest + gh api                                                         | Confirmed `v6.0.0`, Aug 9 2025; current                                                                           |
| `pre-commit-hooks@v6.0.0` commit SHA                   | Bash (gh api)                      | `api.github.com/repos/pre-commit/pre-commit-hooks/git/refs/tags/v6.0.0`          | `3e8a8703264a2f4a69428a0aa4dcb512790b2c8c` (direct commit)                                                        |
| `cspell-cli` latest is `v9.7.0`                        | WebFetch                           | `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`             | Confirmed `v9.7.0`, Feb 23 2026                                                                                   |
| `cspell-cli` tags agree                                | WebFetch                           | `api.github.com/repos/streetsidesoftware/cspell-cli/tags`                        | Top tag: `v9.7.0`                                                                                                 |
| `markdownlint-cli2` latest is `v0.22.0`                | WebFetch                           | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`                         | `v0.22.0` (releases/latest returns 404 — tags-only repo)                                                          |
| `biomejs/pre-commit` latest is `v2.4.8`                | WebFetch                           | `api.github.com/repos/biomejs/pre-commit/tags`                                   | `v2.4.8` (releases/latest returns stale `v0.6.1` Dec 2024 — tags are authoritative)                               |
| `biomejs/pre-commit@v2.4.8` commit SHA (annotated tag) | Bash (gh api, two-step resolution) | tag object `d83759cbaf6baaa79e25ee04e4638d57ce7dc294` resolved to commit         | Commit SHA: `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc`                                                            |
| `gitleaks` latest is `v8.30.1`                         | WebFetch                           | `api.github.com/repos/gitleaks/gitleaks/releases/latest`                         | Confirmed `v8.30.1`, Mar 21 2026                                                                                  |
| `gitleaks` tags agree                                  | WebFetch                           | `api.github.com/repos/gitleaks/gitleaks/tags`                                    | Top tag: `v8.30.1`                                                                                                |
| `gitleaks@v8.30.1` commit SHA                          | Bash (gh api)                      | `api.github.com/repos/gitleaks/gitleaks/git/refs/tags/v8.30.1`                   | `83d9cd684c87d95d656c1458ef04895a7f1cbd8e` (direct commit)                                                        |
| `sync-pre-commit-deps` latest is `v0.0.3`              | WebFetch                           | `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`                      | Only 3 tags exist, `v0.0.3` is current                                                                            |
| No CVE for `actions/checkout` itself                   | WebSearch                          | "actions/checkout CVE security advisory 2025 2026"                               | No CVE for the action itself; CVE-2025-61671 is a misuse pattern (pull_request_target), not a bug in the action   |
| No CVE for `actions/setup-python`                      | WebSearch                          | "actions/setup-python CVE security advisory 2025 2026"                           | No CVE found                                                                                                      |
| No CVE for `pre-commit/action`                         | WebSearch                          | "pre-commit action CVE security advisory 2025 2026"                              | No CVE found                                                                                                      |
| No CVE for `markdownlint-cli2`                         | WebSearch                          | "markdownlint-cli2 DavidAnson CVE security advisory 2025 2026"                   | No CVE found                                                                                                      |
| CVE-2026-25931 scope (VS Code extension only)          | WebSearch                          | "cspell streetsidesoftware CVE security advisory 2025 2026"                      | CVE-2026-25931 (GHSA-mggq-68mr-58vj) affects vscode-spell-checker extension only, NOT cspell-cli or cspell-action |
| No CVE for gitleaks tool                               | WebSearch                          | "gitleaks tool zricethezav security advisory CVE 2025 2026"                      | No CVE found for the tool itself                                                                                  |
| markdownlint-cli2 v0.21.0->v0.22.0 changelog           | WebFetch                           | `raw.githubusercontent.com/DavidAnson/markdownlint-cli2/main/CHANGELOG.md`       | No breaking changes for this project's usage; removed entry points not used here                                  |
| cspell-cli v9.6.0->v9.7.0 changelog                    | WebFetch                           | `raw.githubusercontent.com/streetsidesoftware/cspell-cli/main/CHANGELOG.md`      | No breaking changes; dependency bump only                                                                         |
| markdownlint-cli2-action version vs cli2 version       | Bash (gh api)                      | releases list for markdownlint-cli2-action                                       | v22.0.0 bundles cli2 v0.20.0 — independent versioning schemes confirmed                                           |
| biomejs/pre-commit annotated tag resolution            | Bash (gh api two-step)             | tag object SHA -> commit SHA                                                     | Annotated tag; commit SHA is `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc`                                           |

### Self-check

- Every version sourced from a live lookup? Yes.
- Both releases AND tags checked? Yes. Two divergence cases found and documented: `biomejs/pre-commit` (releases/latest stale at v0.6.1; tags show v2.4.8) and `DavidAnson/markdownlint-cli2` (releases/latest returns 404; tags used).
- Every dependency covered by at least one security search? Yes. All 5 action repos and all pre-commit hook authors covered. CVE-2026-25931 scoping (VS Code extension only, not CLI) explicitly verified.
- Changelogs read for every upgrade? Yes: markdownlint-cli2 (v0.21.0->v0.22.0), cspell-cli (v9.6.0->v9.7.0). Gitleaks and biomejs are patch-only bumps with no reported breaking changes.
- SHA fetched for every GitHub Action reference? Yes. All 5 actions have verified commit SHAs. Annotated tag for biomejs/pre-commit resolved via two-step lookup.
- Internal consistency: The `biome.json` schema URL pins `2.4.4` while the pre-commit hook is also at `v2.4.4` — they agree now. A bump to `v2.4.8` requires updating both files together.
- False contemporaneity claims: None in this plan. All versions are explicitly dated and marked current as of 2026-03-23.
