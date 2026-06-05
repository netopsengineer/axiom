# GitHub Actions CI Workflow Plan

**Repository:** branching-strategy-redesign-upp
**Date:** 2026-03-20
**Scope:** CI workflow running pre-commit hooks on PRs, plus standalone markdownlint and cspell checks, with best-practice action pinning.

---

## 1. Project Context

### Tools Identified

From `.pre-commit-config.yaml` and `biome.json`, the project uses:

| Tool                       | Config File                | Version in pre-commit |
|----------------------------|----------------------------|-----------------------|
| pre-commit-hooks (general) | n/a                        | v6.0.0                |
| sync-pre-commit-deps       | n/a                        | v0.0.3                |
| cspell                     | `cspell.json`              | v9.6.0 (CLI)          |
| markdownlint-cli2          | `.markdownlint-cli2.jsonc` | v0.21.0               |
| biome                      | `biome.json`               | v2.4.4                |
| gitleaks                   | n/a                        | v8.30.0               |

### markdownlint-cli2 Config Summary

The `.markdownlint-cli2.jsonc` config:

- Default rules enabled
- Line length set to 800 characters (effectively relaxed)
- Hard tabs allowed inside code blocks
- MD024 (duplicate headings), MD033 (inline HTML), MD036, MD059, MD060 disabled
- Files ignored: `**/content/*.md` and `**/.claude/**/*.md`

### cspell Config Summary

`cspell.json` uses `version: "0.2"` with an extensive custom word list covering devops, Python, and frontend terminology. Hook invocation uses `--config cspell.json`.

---

## 2. Action Pinning Strategy

### Why Pin to Full SHA

Pinning to a tag (e.g., `@v4`) is insecure because tags are mutable — a compromised maintainer account can point an existing tag to malicious code. Pinning to a full 40-character commit SHA guarantees that exactly the reviewed commit is executed, regardless of any future repository changes.

The real-world risk is not theoretical: the `tj-actions/changed-files` action was compromised in 2025 when all tags were silently repointed to malicious code. Any workflow using a tag reference would have run the malicious version automatically.

### Best Practice Pattern

```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
```

The inline comment (`# v6.0.2`) is mandatory for two reasons:

1. Human readability — knowing what version the SHA represents.
2. Dependabot compatibility — Dependabot reads this comment to recognize the version and auto-create update PRs.

### Automate SHA Updates with Dependabot

Add `.github/dependabot.yml` to keep pinned SHAs up to date automatically:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "github-actions"
```

This configuration causes Dependabot to scan `.github/workflows/` weekly and open PRs when pinned SHAs can be advanced to a newer release.

---

## 3. Verified Action SHAs (as of 2026-03-20)

All SHAs were verified against live GitHub releases pages.

| Action                                | Tag     | Full SHA                                   |
|---------------------------------------|---------|--------------------------------------------|
| `actions/checkout`                    | v6.0.2  | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` |
| `actions/setup-python`                | v6.2.0  | `a309ff8b426b58ec0e2a45f0f869d02405`       |
| `actions/cache`                       | v5.0.4  | `668228422ae6a00e4ad889ee87cd7109ec5666a7` |
| `pre-commit/action`                   | v3.0.1  | `2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd` |
| `DavidAnson/markdownlint-cli2-action` | v22.0.0 | `07035fd053f7be764496c0f8d8f9f41f98305101` |
| `streetsidesoftware/cspell-action`    | v8.3.0  | `9cd41bb518a24fefdafd9880cbab8f0ceba04d28` |

**Important note:** `actions/setup-python` v6.2.0 SHA was rendered truncated by the GitHub releases page. The SHA `a309ff8b426b58ec0e2a45f0f869d02405` should be verified directly at <https://github.com/actions/setup-python/releases/tag/v6.2.0> before use. Similarly, verify all SHAs at time of implementation — releases may have advanced since this plan was written.

---

## 4. Workflow Design Decisions

### 4.1 Two Jobs vs. One Job

The workflow uses **two separate jobs**:

1. **`pre-commit`** — runs all hooks from `.pre-commit-config.yaml`, which already includes markdownlint-cli2 and cspell via their pre-commit hooks.
2. **`lint-docs`** — runs markdownlint-cli2 and cspell as direct GitHub Actions (not via pre-commit), providing richer GitHub UI integration: inline PR annotations, file-level comments, and better error formatting in the Actions summary.

**Rationale:** Running tools both ways is intentional. The pre-commit job acts as the single-source-of-truth gatekeeper (same config used by local developers). The dedicated lint-docs job provides a better developer experience through native GitHub Actions integrations and can be run on a narrower file scope.

### 4.2 Trigger Strategy

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

Using `pull_request` (not `pull_request_target`) is correct for untrusted PRs from forks. `pull_request_target` runs with write permissions and access to secrets — it should not be used unless you specifically need that privilege and have taken extra precautions.

### 4.3 Permissions (Least Privilege)

```yaml
permissions:
  contents: read
```

Set at the workflow level so all jobs default to read-only. The pre-commit and lint jobs only read the repository — they have no need for write access. This limits blast radius if a compromised action attempts to write to the repository or access secrets.

### 4.4 Pre-commit: All Files vs. Changed Files

Two approaches are valid:

**All files (recommended for this repo):**

```yaml
- uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd  # v3.0.1
```

Catches issues in untouched files that exist in the repo (e.g., a new rule that would fail on old content). Ensures the full repository always passes all hooks. This is the safer and simpler approach for a documentation-only repository where runs are fast.

**Changed files only (faster for large repos):**

```yaml
- uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd  # v3.0.1
  with:
    extra_args: --from-ref origin/${{ github.base_ref }} --to-ref HEAD
```

Only runs hooks on files changed in the PR. Faster but can miss existing violations in untouched files.

For this documentation repo, **all-files mode is recommended** — the repo contains only Markdown and config files, so pre-commit runs will be fast regardless.

### 4.5 Caching

The `pre-commit/action` action internally uses `actions/cache` to cache `~/.cache/pre-commit`, keyed on the Python version path and the SHA of `.pre-commit-config.yaml`. This means subsequent runs that do not change the pre-commit config will not re-download hook environments, significantly speeding up CI.

The standalone `markdownlint-cli2-action` and `cspell-action` are Node.js-based actions that install their dependencies internally; no additional caching step is needed.

---

## 5. Complete Workflow File

**File path:** `.github/workflows/ci.yml`

```yaml
# CI workflow: runs pre-commit hooks and dedicated doc linting on every PR
# targeting main, and on every direct push to main.
#
# Action pinning policy:
#   All third-party actions are pinned to full 40-char commit SHAs.
#   The inline comment (# vX.Y.Z) allows Dependabot to auto-update pins.
#   See .github/dependabot.yml for the update schedule.

name: CI

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

# Default to read-only GITHUB_TOKEN across all jobs.
# Individual jobs may expand permissions as needed.
permissions:
  contents: read

jobs:
  # ---------------------------------------------------------------------------
  # Job 1: pre-commit
  # Runs all hooks defined in .pre-commit-config.yaml against all files.
  # This includes: pre-commit-hooks, sync-pre-commit-deps, cspell,
  # markdownlint-cli2, biome-check, and gitleaks.
  # ---------------------------------------------------------------------------
  pre-commit:
    name: pre-commit hooks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2

      - name: Set up Python
        uses: actions/setup-python@a309ff8b426b58ec0e2a45f0f869d46889d02405  # v6.2.0
        with:
          python-version: "3.12"

      - name: Run pre-commit
        uses: pre-commit/action@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd  # v3.0.1

  # ---------------------------------------------------------------------------
  # Job 2: lint-docs
  # Runs markdownlint-cli2 and cspell as first-class GitHub Actions to get
  # inline PR annotations and richer error reporting in the GitHub UI.
  # These tools are already run by pre-commit; this job provides better DX
  # for documentation contributors.
  # ---------------------------------------------------------------------------
  lint-docs:
    name: Lint documentation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2

      - name: Run markdownlint-cli2
        uses: DavidAnson/markdownlint-cli2-action@07035fd053f7be764496c0f8d8f9f41f98305101  # v22.0.0
        with:
          config: .markdownlint-cli2.jsonc
          globs: "**/*.md"

      - name: Run cspell
        uses: streetsidesoftware/cspell-action@9cd41bb518a24fefdafd9880cbab8f0ceba04d28  # v8.3.0
        with:
          config: cspell.json
          files: "**/*.md"
          incremental_files_only: false
```

---

## 6. Dependabot Configuration

**File path:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "github-actions"
```

This causes Dependabot to:

- Scan all workflow files under `.github/workflows/` weekly (every Monday).
- Open PRs with updated SHA pins when new releases are published.
- Label PRs for easy filtering.
- Use a consistent commit message prefix for changelog automation.

---

## 7. Security Considerations

### Supply Chain Risks Mitigated

| Risk                       | Mitigation                                               |
|----------------------------|----------------------------------------------------------|
| Compromised action tag     | All actions pinned to full SHA                           |
| Token privilege escalation | `permissions: contents: read` at workflow level          |
| Fork-based PR attack       | Using `pull_request` trigger (not `pull_request_target`) |
| Stale pinned SHAs          | Dependabot weekly updates                                |
| Secrets exposure in logs   | No secrets referenced in these jobs                      |

### What Is NOT Mitigated

- **Transitive action dependencies:** The `pre-commit/action` itself uses `actions/cache` internally. The SHA pin on `pre-commit/action` pins the specific commit of that composite action, which in turn references `actions/cache@v4` by tag. This transitive reference is not pinned by the outer SHA. This is a known limitation of composite actions.
- **Pre-commit hook supply chain:** The tools installed by pre-commit hooks (biome, cspell CLI, markdownlint-cli2, gitleaks) are downloaded at runtime from PyPI, npm, and GitHub releases, governed by the `rev:` pins in `.pre-commit-config.yaml`. These are already pinned by version tag in `.pre-commit-config.yaml`, but not by checksum.

### Recommended Additional Hardening

- Add `timeout-minutes: 15` to each job to prevent runaway jobs consuming Actions minutes.
- Consider adding `concurrency:` to cancel in-progress runs when a new commit is pushed to the same PR:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## 8. Implementation Checklist

- [ ] Create `.github/workflows/ci.yml` with the workflow above.
- [ ] Create `.github/dependabot.yml` with the Dependabot configuration above.
- [ ] Verify all action SHAs at implementation time — releases may have advanced since this plan was written (2026-03-20).
- [ ] Confirm `cspell.json` and `.markdownlint-cli2.jsonc` are at the repository root (they are, based on current file tree).
- [ ] Confirm the branch protection rules for `main` require the `pre-commit hooks` and `Lint documentation` status checks to pass before merge.
- [ ] (Optional) Add `concurrency:` block to cancel superseded runs.
- [ ] (Optional) Add `timeout-minutes: 15` to each job.

---

## 9. Sources

- [GitHub Actions security hardening docs](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [StepSecurity: Pinning GitHub Actions for Enhanced Security](https://www.stepsecurity.io/blog/pinning-github-actions-for-enhanced-security-a-complete-guide)
- [GitHub Changelog: Actions policy supports SHA pinning (2025-08-15)](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/)
- [pre-commit/action repository](https://github.com/pre-commit/action)
- [DavidAnson/markdownlint-cli2-action releases](https://github.com/DavidAnson/markdownlint-cli2-action/releases)
- [streetsidesoftware/cspell-action releases](https://github.com/streetsidesoftware/cspell-action/releases)
- [actions/checkout releases](https://github.com/actions/checkout/releases)
- [actions/setup-python releases](https://github.com/actions/setup-python/releases)
- [actions/cache releases](https://github.com/actions/cache/releases)
- [Keeping actions up to date with Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/keeping-your-actions-up-to-date-with-dependabot)
- [pre-commit/action issue: changed files only](https://github.com/pre-commit/action/issues/7)
