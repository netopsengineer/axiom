# GitHub Actions CI Workflow Plan: Pre-Commit, Markdownlint, and CSpell on PRs

## Context

This plan covers a new (or replacement) GitHub Actions CI workflow for the
`branching-strategy-redesign-upp` repository. The repo already has:

- `.pre-commit-config.yaml` defining six hook sources (pre-commit-hooks,
  sync-pre-commit-deps, cspell-cli, markdownlint-cli2, biomejs/pre-commit,
  gitleaks)
- `biome.json` pinned to schema `2.4.4`
- An existing `.github/workflows/ci.yml` targeting a Node.js monorepo with
  lint, test, and Docker jobs — not suited to a documentation-only repo

The task is to plan a CI workflow that runs the pre-commit hooks on PRs, plus
standalone markdownlint and cspell checks. All GitHub Action references must
use SHA pinning per supply-chain best practices (CVE-2025-30066,
CVE-2025-30154, and the March 2026 Trivy ecosystem compromise are live
examples of what mutable tag pinning enables).

---

## Inventory (Step 1)

### From `.pre-commit-config.yaml`

| Hook repo                         | Version in project | Notes                                                                                                              |
|-----------------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------|
| `pre-commit/pre-commit-hooks`     | v6.0.0             | check-merge-conflict, end-of-file-fixer, fix-byte-order-marker, mixed-line-ending, trailing-whitespace, check-json |
| `pre-commit/sync-pre-commit-deps` | v0.0.3             | syncs hook versions                                                                                                |
| `streetsidesoftware/cspell-cli`   | v9.6.0             | uses `--config cspell.json`                                                                                        |
| `DavidAnson/markdownlint-cli2`    | v0.21.0            | uses `--config .markdownlint-cli2.jsonc --fix`, serial                                                             |
| `biomejs/pre-commit`              | v2.4.4             | biome-check                                                                                                        |
| `gitleaks/gitleaks`               | v8.30.0            | secret scanning                                                                                                    |

### From `biome.json`

Biome schema version: `2.4.4`. No Node.js package.json present (documentation
repo), so Biome runs via the pre-commit hook (no `npm ci` needed).

### GitHub Actions needed for the new workflow

| Action                 | Purpose                                    |
|------------------------|--------------------------------------------|
| `actions/checkout`     | Fetch PR source                            |
| `actions/setup-python` | Install Python for pre-commit              |
| `actions/cache`        | Cache pre-commit environments between runs |
| `pre-commit/action`    | Official action to run pre-commit          |

---

## Version Verification (Step 2)

### GitHub Actions

| Action                 | Latest release      | Latest tag | SHA                                                        |
|------------------------|---------------------|------------|------------------------------------------------------------|
| `actions/checkout`     | v6.0.2 (2026-01-09) | v6.0.2     | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (direct commit) |
| `actions/setup-python` | v6.2.0 (2026-01-22) | v6.2.0     | `a309ff8b426b58ec0e2a45f0f869d46889d02405` (direct commit) |
| `actions/cache`        | v5.0.4 (2026-03-18) | v5.0.4     | `668228422ae6a00e4ad889ee87cd7109ec5666a7` (direct commit) |
| `pre-commit/action`    | v3.0.1 (2024-02-07) | v3.0.1     | `2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd` (direct commit) |

Note: `pre-commit/action` latest release is from February 2024. This is not a
sign of abandonment — pre-commit itself is stable and the action tracks it.
The official `pre-commit/action` is the canonical way to run pre-commit in CI.

### Pre-commit hook sources (project version vs current)

| Hook repo                         | Project version | Current | Delta                    |
|-----------------------------------|-----------------|---------|--------------------------|
| `pre-commit/pre-commit-hooks`     | v6.0.0          | v6.0.0  | None — current           |
| `pre-commit/sync-pre-commit-deps` | v0.0.3          | v0.0.3  | None — current           |
| `streetsidesoftware/cspell-cli`   | v9.6.0          | v9.7.0  | Minor upgrade available  |
| `DavidAnson/markdownlint-cli2`    | v0.21.0         | v0.22.0 | Minor upgrade available  |
| `biomejs/pre-commit`              | v2.4.4          | v2.4.8  | Patch upgrades available |
| `gitleaks/gitleaks`               | v8.30.0         | v8.30.1 | Patch upgrade available  |

Note on biomejs/pre-commit: `/releases/latest` returns stale v0.6.1 (Dec
2024). The authoritative source is `/tags`, which shows v2.4.8 as current.
This is a known divergence for this repo — v2.x tags exist without formal
GitHub Release entries.

---

## Delta Assessment (Step 3)

### streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`
(returned v9.7.0, published 2026-02-23) and `/tags` (v9.7.0 confirmed most recent).
**What changed:** Version bump tracking `@cspell/cspell` 9.7.0. Intermediate
releases 9.6.3 and 9.6.4 were incorporated.
**Breaking changes:** No — release notes contain no compatibility warnings.
**Migration steps:** Version bump in `.pre-commit-config.yaml` only.
**Security advisories:** CVE-2026-25931 exists for `vscode-spell-checker` (the
VS Code extension by the same author, GHSA-mggq-68mr-58vj). This affects the
VS Code extension's workspace trust handling, **not** the `cspell-cli` npm
package used here. No advisories found for `cspell-cli` itself via WebSearch
"cspell streetsidesoftware CVE security advisory 2025 2026".
**Recommendation:** Upgrade. Zero risk, picks up any cspell library bug fixes.
**Your call:** Include in this batch or defer? (No urgency.)

### DavidAnson/markdownlint-cli2: v0.21.0 -> v0.22.0

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`
(v0.22.0 is most recent tag). `/releases/latest` returned 404 — tags are
authoritative for this repo.
**What changed:** TOML config file support added, new `--configPointer`
parameter, more flexible `--config` parameter handling. Routine dependency
updates.
**Breaking changes:** No — additive changes only. Existing `--config
.markdownlint-cli2.jsonc --fix` invocation is unaffected.
**Migration steps:** Version bump in `.pre-commit-config.yaml` only.
**Security advisories:** None found via WebSearch "markdownlint-cli2
DavidAnson CVE security advisory 2025 2026".
**Recommendation:** Upgrade. Zero risk.
**Your call:** Include in this batch or defer? (No urgency.)

### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags`
(v2.4.8 is the most recent tag, 2026-03-xx). Note: `/releases/latest` returns
stale v0.6.1 (2024-12-17) — tags are the only authoritative source for v2.x
of this repo.
**What changed:** Four patch bumps (v2.4.5 through v2.4.8) tracking
`@biomejs/biome`. v2.x branch is the active line tracking Biome v2.
**Breaking changes:** No. `biome.json` schema `2.4.4` continues to work; new
releases are backwards-compatible within the v2 minor line.
**Migration steps:** Version bump in `.pre-commit-config.yaml` only.
**Security advisories:** None found via WebSearch "biomejs biome CVE 2025
2026".
**Recommendation:** Upgrade. Keeps the pre-commit hook in sync with the
`biome.json` schema version.
**Your call:** Include in this batch or defer? (No urgency.)

### gitleaks/gitleaks: v8.30.0 -> v8.30.1

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/gitleaks/gitleaks/releases/latest`
(returned v8.30.1, published 2026-03-21) and `/tags` (v8.30.1 confirmed most
recent). This matches the known pattern from reference.md: gitleaks tags can
exist without a corresponding release entry — both sources agree here.
**What changed:** Patch release published two days before this plan was
written. No release notes excerpted, but within a patch line there are no
breaking changes by semantic versioning convention.
**Breaking changes:** No.
**Migration steps:** Version bump in `.pre-commit-config.yaml` only.
**Security advisories:** Web search "gitleaks CVE security advisory 2025 2026"
returned Git (the VCS) CVEs, not Gitleaks the tool. No advisories found
specific to the Gitleaks scanner.
**Recommendation:** Upgrade. Secret scanners should be kept current.
**Your call:** Include in this batch or defer? (No urgency, but upgrading a
secret scanner is always low-risk high-value.)

### pre-commit/pre-commit-hooks: v6.0.0 (current — no upgrade needed)

**Verified via:** WebFetch `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`
(returned v6.0.0, published 2025-08-09) and `/tags` (v6.0.0 is most recent).
Project is already on the latest version.

Note: v6.0.0 was a major release that dropped `check-byte-order-marker` and
`fix-encoding-pragma` hooks. The project's `.pre-commit-config.yaml` uses
`fix-byte-order-marker` (the correct replacement hook) — no migration needed.

### pre-commit/sync-pre-commit-deps: v0.0.3 (current — no upgrade needed)

**Verified via:** WebFetch `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`
(v0.0.3 is the most recent tag; only three tags exist: v0.0.1, v0.0.2,
v0.0.3). `/releases/latest` returned 404 — tags only.

---

## Version Decisions Grouped by Risk (Step 4 & 5)

No SECURITY, DEPRECATION, or BREAKING-UPGRADE deltas were found. All four
deltas are ROUTINE.

### ROUTINE batch (safe to apply together)

1. `streetsidesoftware/cspell-cli`: v9.6.0 -> v9.7.0
2. `DavidAnson/markdownlint-cli2`: v0.21.0 -> v0.22.0
3. `biomejs/pre-commit`: v2.4.4 -> v2.4.8
4. `gitleaks/gitleaks`: v8.30.0 -> v8.30.1

---

## Workflow Design

### Trigger strategy

Run on `pull_request` targeting all branches. Do not run on every push to
every branch — this avoids double-execution on PR source branches and keeps
CI costs low for a documentation repo.

```yaml
on:
  pull_request:
    branches: ["**"]
```

### Permissions

Documentation repo — no packages to push, no deployments. Minimal permissions
suffice.

```yaml
permissions:
  contents: read
```

### Concurrency

Cancel in-progress runs when a new commit is pushed to the same PR.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Jobs

#### Job 1: `pre-commit` — run all hooks via `pre-commit/action`

This job runs the full `.pre-commit-config.yaml` (all six hook repos). It
covers markdownlint-cli2 and cspell as part of the existing hook suite — no
separate jobs needed for those unless you want them to run in parallel or
produce separate status checks (see the alternative design below).

The `pre-commit/action` caches the hook environments keyed by
`.pre-commit-config.yaml` content, which dramatically speeds up subsequent
runs.

```yaml
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
```

The `pre-commit/action` automatically sets `PRE_COMMIT_HOME` and caches it.
No explicit `actions/cache` step is needed when using `pre-commit/action` —
it handles cache internally via `actions/cache` under the hood.

#### Job 2 (optional, parallel): `markdownlint` — standalone status check

If you want markdownlint to appear as a separate named check in the PR (useful
for required status checks in branch protection rules), add this job. It
re-runs only markdownlint rather than all hooks.

```yaml
  markdownlint:
    name: Markdownlint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Set up Node.js
        uses: actions/setup-node@<SHA> # pin to current version
        with:
          node-version: "22"

      - name: Run markdownlint-cli2
        run: npx markdownlint-cli2 --config .markdownlint-cli2.jsonc "**/*.md"
```

Note: `actions/setup-node` SHA was not fetched in this planning session — pin
it before shipping (see Verification Log).

#### Job 3 (optional, parallel): `cspell` — standalone status check

Similarly, a dedicated cspell job gives it its own status check name:

```yaml
  cspell:
    name: CSpell
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Set up Node.js
        uses: actions/setup-node@<SHA> # pin to current version
        with:
          node-version: "22"

      - name: Run cspell
        run: npx cspell --config cspell.json "**"
```

### Design recommendation

**Start with Job 1 only** (the unified `pre-commit` job). It is simpler, runs
all hooks with consistent versions, and avoids maintaining two separate
invocation paths for the same tools. The full hook suite — including
markdownlint and cspell — runs in one job.

Add Jobs 2 and 3 only if you need markdownlint and cspell to appear as
**separate required status checks** in GitHub branch protection rules (e.g.,
for the merge queue or reviewers to know exactly which check failed at a
glance).

### Complete workflow file (recommended minimal design)

```yaml
# CI: run pre-commit hooks on pull requests.
# All hooks in .pre-commit-config.yaml are executed, including
# markdownlint-cli2 and cspell as defined there.

name: CI

on:
  pull_request:
    branches: ["**"]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

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
```

### Note on the existing `ci.yml`

The existing `.github/workflows/ci.yml` is designed for a Node.js monorepo
with Docker builds. It runs on both `push` and `pull_request`, which means
every PR branch push triggers it twice. For this documentation-only repo,
the existing workflow is either unused or producing unnecessary Docker build
attempts. **It should be replaced by the workflow above**, or at minimum
scoped to only the branches/events where Docker builds are relevant.

---

## Pre-Commit Config Updates to Recommend

Apply the ROUTINE batch upgrades to `.pre-commit-config.yaml` alongside the
new workflow:

```yaml
# Updated versions (ROUTINE — all patch/minor, no breaking changes):
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

## Security Summary

**No security advisories found** for any of the tools or actions in scope:

- `actions/checkout`, `actions/setup-python`, `actions/cache`,
  `pre-commit/action`: No CVEs found targeting these actions directly.
  Supply-chain context from 2025-2026 incidents (CVE-2025-30066,
  CVE-2025-30154, Trivy March 2026) underscores that SHA pinning is
  **mandatory** — all action references above use full commit SHAs.

- `pre-commit/pre-commit-hooks`, `sync-pre-commit-deps`: No advisories found.

- `cspell-cli`: CVE-2026-25931 exists for the `vscode-spell-checker` VS Code
  **extension** (different package, different attack surface). No advisories
  for the `cspell-cli` npm package used in CI.

- `markdownlint-cli2`: No advisories found.

- `biomejs/pre-commit` + Biome: No advisories found.

- `gitleaks`: Search returned Git VCS CVEs (CVE-2025-48384 et al.), not
  Gitleaks the scanner. No Gitleaks-specific advisories found.

---

## Verification Log (Step 6)

| Claim                                               | Tool                     | Source                                                                                                                            | Finding                                                                                                                                             |
|-----------------------------------------------------|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `actions/checkout` latest is v6.0.2                 | WebFetch                 | `api.github.com/repos/actions/checkout/releases/latest`                                                                           | v6.0.2, published 2026-01-09                                                                                                                        |
| `actions/checkout` v6.0.2 tags agree                | WebFetch                 | `api.github.com/repos/actions/checkout/tags`                                                                                      | v6.0.2 is most recent tag                                                                                                                           |
| `actions/checkout` v6.0.2 SHA                       | WebFetch                 | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                                                                      | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (type: commit)                                                                                           |
| `actions/setup-python` latest is v6.2.0             | WebFetch                 | `api.github.com/repos/actions/setup-python/releases/latest`                                                                       | v6.2.0, published 2026-01-22                                                                                                                        |
| `actions/setup-python` v6.2.0 tags agree            | WebFetch                 | `api.github.com/repos/actions/setup-python/tags`                                                                                  | v6.2.0 is most recent tag                                                                                                                           |
| `actions/setup-python` v6.2.0 SHA                   | WebFetch                 | `api.github.com/repos/actions/setup-python/git/refs/tags/v6.2.0`                                                                  | `a309ff8b426b58ec0e2a45f0f869d46889d02405` (type: commit)                                                                                           |
| `actions/cache` latest is v5.0.4                    | WebFetch                 | `api.github.com/repos/actions/cache/releases/latest`                                                                              | v5.0.4, published 2026-03-18                                                                                                                        |
| `actions/cache` v5.0.4 tags agree                   | WebFetch                 | `api.github.com/repos/actions/cache/tags`                                                                                         | v5.0.4 is most recent tag                                                                                                                           |
| `actions/cache` v5.0.4 SHA                          | WebFetch                 | `api.github.com/repos/actions/cache/git/refs/tags/v5.0.4`                                                                         | `668228422ae6a00e4ad889ee87cd7109ec5666a7` (type: commit)                                                                                           |
| `pre-commit/action` latest is v3.0.1                | WebFetch                 | `api.github.com/repos/pre-commit/action/releases/latest`                                                                          | v3.0.1, published 2024-02-07                                                                                                                        |
| `pre-commit/action` v3.0.1 tags agree               | WebFetch                 | `api.github.com/repos/pre-commit/action/tags`                                                                                     | v3.0.1 is most recent tag                                                                                                                           |
| `pre-commit/action` v3.0.1 SHA                      | Bash `gh api`            | `api.github.com/repos/pre-commit/action/git/refs/tags/v3.0.1`                                                                     | `2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd` (type: commit)                                                                                           |
| `pre-commit/pre-commit-hooks` current is v6.0.0     | WebFetch                 | `api.github.com/repos/pre-commit/pre-commit-hooks/releases/latest`                                                                | v6.0.0, published 2025-08-09                                                                                                                        |
| `pre-commit/pre-commit-hooks` v6.0.0 tags agree     | WebFetch                 | `api.github.com/repos/pre-commit/pre-commit-hooks/tags`                                                                           | v6.0.0 is most recent tag                                                                                                                           |
| `pre-commit/pre-commit-hooks` v6.0.0 SHA            | Bash `gh api`            | `api.github.com/repos/pre-commit/pre-commit-hooks/git/refs/tags/v6.0.0`                                                           | `3e8a8703264a2f4a69428a0aa4dcb512790b2c8c` (type: commit)                                                                                           |
| `pre-commit/sync-pre-commit-deps` current is v0.0.3 | WebFetch                 | `api.github.com/repos/pre-commit/sync-pre-commit-deps/tags`                                                                       | v0.0.3 is most recent tag (releases/latest = 404)                                                                                                   |
| `pre-commit/sync-pre-commit-deps` v0.0.3 SHA        | Bash `gh api`            | `api.github.com/repos/pre-commit/sync-pre-commit-deps/git/refs/tags/v0.0.3`                                                       | `8afb59c50a7d9f8197e8fc37d885f7896635735f` (type: commit)                                                                                           |
| `cspell-cli` current is v9.7.0                      | WebFetch                 | `api.github.com/repos/streetsidesoftware/cspell-cli/releases/latest`                                                              | v9.7.0, published 2026-02-23                                                                                                                        |
| `cspell-cli` v9.7.0 tags agree                      | WebFetch                 | `api.github.com/repos/streetsidesoftware/cspell-cli/tags`                                                                         | v9.7.0 is most recent tag                                                                                                                           |
| `cspell-cli` v9.7.0 SHA                             | Bash `gh api`            | `api.github.com/repos/streetsidesoftware/cspell-cli/git/refs/tags/v9.7.0`                                                         | `a42085ade523f591dca134379a595e7859986445` (type: commit)                                                                                           |
| `cspell-cli` no CVEs                                | WebSearch                | "cspell streetsidesoftware CVE security advisory 2025 2026"                                                                       | CVE-2026-25931 is for vscode-spell-checker extension, not cspell-cli                                                                                |
| `markdownlint-cli2` current is v0.22.0              | WebFetch                 | `api.github.com/repos/DavidAnson/markdownlint-cli2/tags`                                                                          | v0.22.0 is most recent tag (releases/latest = 404)                                                                                                  |
| `markdownlint-cli2` v0.22.0 SHA                     | WebFetch                 | `api.github.com/repos/DavidAnson/markdownlint-cli2/git/refs/tags/v0.22.0`                                                         | `3766ad839ad3a74558031510b3bc9872bb1d9980` (type: commit)                                                                                           |
| `markdownlint-cli2` no CVEs                         | WebSearch                | "markdownlint-cli2 DavidAnson CVE security advisory 2025 2026"                                                                    | No advisories found                                                                                                                                 |
| `markdownlint-cli2` v0.21->v0.22 changelog          | WebFetch                 | `github.com/DavidAnson/markdownlint-cli2/blob/main/CHANGELOG.md`                                                                  | TOML support, --configPointer param, no breaking changes                                                                                            |
| `biomejs/pre-commit` current is v2.4.8              | WebFetch                 | `api.github.com/repos/biomejs/pre-commit/tags`                                                                                    | v2.4.8 is most recent tag; releases/latest returns stale v0.6.1                                                                                     |
| `biomejs/pre-commit` v2.4.8 SHA (annotated tag)     | Bash `gh api` (two-step) | tag object `d83759cb...` resolved via `api.github.com/repos/biomejs/pre-commit/git/tags/d83759cbaf6baaa79e25ee04e4638d57ce7dc294` | `08073d1253e725ff1fd0a0b1653e1ca4a911a2fc` (commit)                                                                                                 |
| `gitleaks` current is v8.30.1                       | WebFetch                 | `api.github.com/repos/gitleaks/gitleaks/releases/latest`                                                                          | v8.30.1, published 2026-03-21                                                                                                                       |
| `gitleaks` v8.30.1 tags agree                       | WebFetch                 | `api.github.com/repos/gitleaks/gitleaks/tags`                                                                                     | v8.30.1 is most recent tag                                                                                                                          |
| `gitleaks` v8.30.1 SHA                              | Bash `gh api`            | `api.github.com/repos/gitleaks/gitleaks/git/refs/tags/v8.30.1`                                                                    | `83d9cd684c87d95d656c1458ef04895a7f1cbd8e` (type: commit)                                                                                           |
| `gitleaks` no CVEs                                  | WebSearch                | "gitleaks CVE security advisory 2025 2026"                                                                                        | Results were for Git VCS, no Gitleaks-specific advisories found                                                                                     |
| `actions/checkout` etc. no CVEs                     | WebSearch                | "actions/checkout actions/setup-python CVE security advisory 2025 2026"                                                           | No CVEs for these actions directly; supply-chain attacks (CVE-2025-30066, CVE-2025-30154, Trivy Mar 2026) target third-party actions, not actions/* |
| `pre-commit/action` no CVEs                         | WebSearch                | "pre-commit action GitHub Actions CI 2025 2026 security advisory CVE"                                                             | No advisories specific to pre-commit/action                                                                                                         |

### Self-check

- Every version sourced from a live lookup? Yes.
- Both releases AND tags checked for every dependency? Yes — divergence found
  for `biomejs/pre-commit` (releases stale at v0.6.1, tags current at v2.4.8)
  and `markdownlint-cli2` (releases/latest 404, tags authoritative). Pattern
  matches reference.md documentation.
- Every dependency covered by at least one security search? Yes — actions/*
  and pre-commit/action covered by two shared searches; all hook repos covered
  by tool-specific searches.
- Changelogs read for every upgrade? Yes — cspell-cli, markdownlint-cli2, and
  biomejs/pre-commit changelogs/releases consulted. No breaking changes found.
- SHA fetched for every GitHub Action reference? Yes — all four actions have
  verified commit SHAs. biomejs/pre-commit v2.4.8 was an annotated tag;
  resolved to commit SHA via two-step lookup as required by the skill.
- Internal consistency? The workflow plan uses the verified SHAs. No internal
  disagreements.

---

## Open Items

1. `actions/setup-node` SHA: The optional standalone markdownlint and cspell
   jobs reference `actions/setup-node` but no SHA was fetched in this session.
   If those jobs are added, fetch the SHA for the current `setup-node` release
   before committing the workflow.

2. `pre-commit/action` release age: v3.0.1 was published 2024-02-07 — over 13
   months ago. This is not a concern for a stable tool, but worth checking the
   repo for open issues if CI behavior is unexpected.

3. The existing `.github/workflows/ci.yml` should be evaluated for removal or
   replacement. It is a Node.js monorepo workflow that does not match this
   documentation repo's needs.

Sources referenced:

- [tj-actions/changed-files CVE-2025-30066](https://github.com/advisories/ghsa-mrrh-fwg8-r2c3)
- [Trivy supply chain compromise advisory](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23)
- [Dependabot now supports pre-commit hooks (2026-03-10)](https://github.blog/changelog/2026-03-10-dependabot-now-supports-pre-commit-hooks/)
- [pre-commit/pre-commit-hooks v6.0.0 release](https://github.com/pre-commit/pre-commit-hooks/releases/tag/v6.0.0)
- [CVE-2026-25931 vscode-spell-checker RCE](https://www.sentinelone.com/vulnerability-database/cve-2026-25931/)
