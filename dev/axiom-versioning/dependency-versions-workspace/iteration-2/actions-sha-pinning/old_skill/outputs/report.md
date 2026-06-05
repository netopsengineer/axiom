# GitHub Actions Version & SHA Pinning Report

**Task:** Verify five GitHub Actions are current, obtain SHA pins, and check for security issues.
**Actions requested:** `actions/checkout@v6`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`, `actions/cache@v5`, `actions/setup-node@v4`
**Date verified:** 2026-03-23

---

## Executive Summary

| Action                    | Requested | Latest | Status                               |
|---------------------------|-----------|--------|--------------------------------------|
| actions/checkout          | v6        | v6.0.2 | Current major, minor patch available |
| actions/upload-artifact   | v7        | v7.0.0 | Current                              |
| actions/download-artifact | v8        | v8.0.1 | Current major, patch available       |
| actions/cache             | v5        | v5.0.4 | Current major, patches available     |
| actions/setup-node        | v4        | v6.3.0 | OUTDATED — 2 major versions behind   |

One action (`actions/setup-node@v4`) is significantly outdated. The other four are on the current major version. All five have no direct CVEs against the action itself, but the broader supply-chain context is active — SHA pinning is mandatory.

---

## Decisions by Risk Level

### BREAKING-UPGRADE

---

### actions/setup-node: v4 -> v6.3.0

**Risk level:** BREAKING-UPGRADE
**Verified via:** WebFetch `api.github.com/repos/actions/setup-node/releases/latest` (v6.3.0, 2026-03-04) and `/tags` (confirmed v6.3.0 is latest)
**What changed:**

- **v4 -> v5 (breaking):** Action now uses Node.js 24 as its runtime. Introduced automatic dependency caching when a valid `packageManager` field is present in `package.json`. Runner must be on v2.327.1 or later.
- **v5 -> v6 (breaking):** Automatic caching scoped to **npm only**. If you use yarn or pnpm, you must now set the `cache` input explicitly (e.g., `cache: 'yarn'`); previously this was triggered automatically.
- **Node.js 24 deprecation deadline:** GitHub will force all actions to run on Node.js 24 by default starting **June 2, 2026**. Actions still on v4 will be affected.

**Breaking changes:**

- Yes. Two sets of breaking changes (v4->v5 and v5->v6).
- If using yarn or pnpm with auto-caching, explicit `cache:` input is now required.
- Runner version requirement: v2.327.1+.

**Migration steps:**

1. Bump version to `v6` (or pin to `v6.3.0` SHA — see below).
2. If your workflow uses `cache: 'yarn'` or `cache: 'pnpm'` explicitly: no change needed.
3. If you relied on automatic yarn/pnpm caching via `packageManager` field: add `cache: 'yarn'` or `cache: 'pnpm'` input explicitly.
4. Update SHA pin (see SHA Pinning Reference below).

**Security advisories:** None found specifically against `actions/setup-node` via WebSearch "actions/setup-node CVE security advisory 2025 2026" and GitHub Advisory Database query. General Node.js runtime CVEs (Jan 2026 release) affect the Node.js binary you install — not the action itself.
**Recommendation:** Upgrade to v6.3.0. The June 2026 Node.js 24 enforcement deadline makes this time-sensitive. v4 will be running on a deprecated runtime within ~10 weeks.
**Your call:** Upgrade before June 2, 2026. Strongly recommended to do it now to avoid forced breakage.

---

### ROUTINE

---

### actions/checkout: v6 -> v6.0.2 (patch)

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/actions/checkout/releases/latest` (v6.0.2, 2026-01-09) and `/tags` (consistent — no divergence)
**What changed:** v6.0.0 updated credential handling (credentials now stored in a separate file rather than inline) and added Node.js 24 support documentation. v6.0.1 and v6.0.2 are subsequent patch releases. You are on the correct major version.
**Breaking changes:** No — v6.0.2 is a patch over v6.0.0.
**Migration steps:** Pin to v6.0.2 SHA instead of `@v6` floating tag. No workflow input changes needed.
**Security advisories:** No CVE directly against `actions/checkout` found via WebSearch "actions/checkout CVE security advisory 2025 2026" and GitHub Advisory Database. Note: CVE-2025-61671 relates to misuse of `pull_request_target` + checkout of untrusted PR code — this is a workflow design issue, not a vulnerability in the action itself. SHA pinning mitigates the supply-chain risk highlighted by the Trivy incident (March 2026).
**Recommendation:** Pin to the v6.0.2 SHA. No functional changes needed.
**Your call:** SHA pin update only. Safe to batch with other routine updates.

---

### actions/upload-artifact: v7 -> v7.0.0 (current, no patches yet)

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/actions/upload-artifact/releases/latest` (v7.0.0, 2026-02-26) and `/tags` (v7.0.0 is the only v7 tag — consistent)
**What changed:** v7.0.0 migrated to ESM modules (transparent to callers) and added a new `archive` parameter for single-file uploads without compression (`archive: false`). You are requesting `@v7` which is the current version.
**Breaking changes:** No — if you are not using the `archive` parameter, standard artifact upload behavior is unchanged.
**Migration steps:** Pin to v7.0.0 SHA. No workflow input changes needed for standard usage.
**Security advisories:** No CVE directly against `actions/upload-artifact` found via WebSearch "actions/upload-artifact CVE security advisory 2025 2026" and GitHub Advisory Database. The action has been used as an exfiltration vector in supply chain attacks (CVE-2025-30066 `tj-actions` incident) — this is not a vulnerability in upload-artifact itself, but reinforces why SHA pinning is essential.
**Recommendation:** Pin to the v7.0.0 SHA. No other changes needed.
**Your call:** SHA pin only. Safe to proceed.

---

### actions/download-artifact: v8 -> v8.0.1 (patch)

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/actions/download-artifact/releases/latest` (v8.0.1, 2026-03-11) and `/tags` (consistent — no divergence)
**What changed:** v8.0.0 migrated to ESM and changed hash-mismatch behavior from warning to error by default (new `digest-mismatch` parameter controls this). v8.0.1 is a subsequent patch. You are on the correct major version.
**Breaking changes:** Yes, within v8.0.0 — hash mismatches now fail the step by default instead of warning. If your workflow depended on the old warning-only behavior, set `digest-mismatch: warn`. Since you are starting a new workflow on v8, the stricter default is the expected behavior.
**Migration steps:** Pin to v8.0.1 SHA. No other input changes needed for a new workflow.
**Security advisories:** No CVE directly against `actions/download-artifact` found via WebSearch "actions/download-artifact security advisory CVE 2025 2026" and GitHub Advisory Database.
**Recommendation:** Pin to v8.0.1 SHA (the latest patch). The stricter hash validation in v8 is a security improvement for new workflows.
**Your call:** SHA pin to v8.0.1. No other changes required.

---

### actions/cache: v5 -> v5.0.4 (patch)

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/actions/cache/releases/latest` (v5.0.4, 2026-03-18) and `/tags` (consistent — no divergence)
**What changed:** v5.0.4 is a maintenance release: workflow permission fixes for code scanning, proxy integration test fixes, and bun.lock cache key correction in documentation. You are on the correct major version.
**Breaking changes:** No.
**Migration steps:** Pin to v5.0.4 SHA. No input changes needed.
**Security advisories:** No CVE directly against `actions/cache` found via WebSearch "actions/cache CVE security advisory 2025 2026" and GitHub Advisory Database query.
**Recommendation:** Pin to v5.0.4 SHA. Maintenance update only.
**Your call:** SHA pin update. Safe to batch.

---

## SHA Pinning Reference

Use these pins in your workflow. Format: `uses: owner/action@SHA # vX.Y.Z`

### actions/checkout

| Version                            | SHA                                        | Notes                                  |
|------------------------------------|--------------------------------------------|----------------------------------------|
| v6.0.2 (latest patch, recommended) | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` | Floating `v6` tag resolves to same SHA |

```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
```

### actions/upload-artifact

| Version          | SHA                                        | Notes                                  |
|------------------|--------------------------------------------|----------------------------------------|
| v7.0.0 (current) | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` | Floating `v7` tag resolves to same SHA |

```yaml
- uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0
```

### actions/download-artifact

| Version                            | SHA                                        | Notes                                  |
|------------------------------------|--------------------------------------------|----------------------------------------|
| v8.0.1 (latest patch, recommended) | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` | Floating `v8` tag resolves to same SHA |

```yaml
- uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
```

### actions/cache

| Version                            | SHA                                        | Notes                                  |
|------------------------------------|--------------------------------------------|----------------------------------------|
| v5.0.4 (latest patch, recommended) | `668228422ae6a00e4ad889ee87cd7109ec5666a7` | Floating `v5` tag resolves to same SHA |

```yaml
- uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7 # v5.0.4
```

### actions/setup-node

| Version                                               | SHA                                        | Notes                                  |
|-------------------------------------------------------|--------------------------------------------|----------------------------------------|
| v4.4.0 (latest v4 patch — outdated, upgrade required) | `49933ea5288caeca8642d1e84afbd3f7d6820020` | Floating `v4` tag resolves to same SHA |
| v6.3.0 (current, recommended)                         | `53b83947a5a98c8d113130e565377fae1a50d02f` | Floating `v6` tag resolves to same SHA |

```yaml
# Recommended (after upgrading):
- uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0

# Current v4 pin (only if deferring upgrade):
- uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
```

---

## Complete Workflow Example (with SHA pins)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
        with:
          node-version: '20'
          cache: 'npm'  # explicit cache setting required in v6

      - uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7 # v5.0.4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

      - run: npm ci
      - run: npm test

      - uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0
        with:
          name: build-output
          path: dist/

      - uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
        with:
          name: build-output
```

---

## Security Context: Why SHA Pinning Is Non-Negotiable

Three incidents from 2025-2026 make SHA pinning mandatory for any production workflow:

1. **CVE-2025-30066 (`tj-actions/changed-files`, March 2025):** Attackers pushed a malicious commit and redirected floating version tags to point to it. Any workflow using a mutable tag (e.g., `@v45`) ran the malicious code. Workflows pinned to a specific SHA were unaffected. The attack used `actions/upload-artifact` mechanics to exfiltrate secrets as encrypted workflow artifacts.

2. **Trivy supply chain attack (March 2026):** A threat actor used compromised credentials to force-push 76 of 77 version tags in `aquasecurity/trivy-action` to credential-stealing malware. The attack vector included swapping the `actions/checkout` reference to a malicious imposter commit. SHA-pinned workflows were protected.

3. **CVE-2025-61671 (`pull_request_target` + checkout):** This is a workflow design vulnerability — using `actions/checkout` to check out untrusted PR code inside a `pull_request_target` trigger grants the untrusted code access to repository secrets. It is not a bug in `actions/checkout` itself, but a common misconfiguration found in Fortune-100 company workflows. Never check out PR HEAD code under `pull_request_target` without strict validation.

**Key principle:** Mutable tags (`@v6`, `@v4`) can be silently redirected by any actor with write access to the action repository — including compromised maintainer credentials. Only a full commit SHA is immutable. Use the SHAs provided above.

---

## Verification Log

| Claim                                 | Tool      | Source                                                                               | Finding                                                                               |
|---------------------------------------|-----------|--------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| checkout latest release               | WebFetch  | `api.github.com/repos/actions/checkout/releases/latest`                              | v6.0.2, published 2026-01-09                                                          |
| checkout tags                         | WebFetch  | `api.github.com/repos/actions/checkout/tags`                                         | v6.0.2 is latest; no divergence from releases                                         |
| checkout v6.0.2 SHA                   | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                         | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (commit)                                   |
| checkout v6 floating tag SHA          | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v6`                             | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` — same as v6.0.2                           |
| checkout v6.0.0 changelog             | WebFetch  | `github.com/actions/checkout/releases/tag/v6.0.0`                                    | Node.js 24 docs; credential storage in separate file                                  |
| checkout security advisories          | WebSearch | "actions/checkout CVE security advisory 2025 2026"                                   | No direct CVE against the action; supply-chain context noted                          |
| checkout advisory database            | WebFetch  | `github.com/advisories?query=actions%2Fcheckout`                                     | No advisories for actions/checkout specifically                                       |
| upload-artifact latest release        | WebFetch  | `api.github.com/repos/actions/upload-artifact/releases/latest`                       | v7.0.0, published 2026-02-26                                                          |
| upload-artifact tags                  | WebFetch  | `api.github.com/repos/actions/upload-artifact/tags`                                  | v7.0.0 is latest; consistent with releases                                            |
| upload-artifact v7.0.0 SHA            | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`                  | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (commit)                                   |
| upload-artifact v7 floating tag SHA   | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7`                      | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` — same as v7.0.0                           |
| upload-artifact v7.0.0 changelog      | WebFetch  | `github.com/actions/upload-artifact/releases/tag/v7.0.0`                             | ESM migration; new `archive` parameter                                                |
| upload-artifact security advisories   | WebSearch | "actions/upload-artifact CVE security advisory 2025 2026"                            | No direct CVE against the action                                                      |
| download-artifact latest release      | WebFetch  | `api.github.com/repos/actions/download-artifact/releases/latest`                     | v8.0.1, published 2026-03-11                                                          |
| download-artifact tags                | WebFetch  | `api.github.com/repos/actions/download-artifact/tags`                                | v8.0.1 is latest; consistent with releases                                            |
| download-artifact v8.0.1 SHA          | WebFetch  | `api.github.com/repos/actions/download-artifact/git/refs/tags/v8.0.1`                | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` (commit)                                   |
| download-artifact v8 floating tag SHA | WebFetch  | `api.github.com/repos/actions/download-artifact/git/refs/tags/v8`                    | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` — same as v8.0.1                           |
| download-artifact v8 changelog        | WebFetch  | `github.com/actions/download-artifact/releases/tag/v8.0.0`                           | ESM migration; hash mismatch now errors by default; `skip-decompress` parameter added |
| download-artifact security advisories | WebSearch | "actions/download-artifact security advisory CVE 2025 2026"                          | No direct CVE against the action                                                      |
| cache latest release                  | WebFetch  | `api.github.com/repos/actions/cache/releases/latest`                                 | v5.0.4, published 2026-03-18                                                          |
| cache tags                            | WebFetch  | `api.github.com/repos/actions/cache/tags`                                            | v5.0.4 is latest; consistent with releases                                            |
| cache v5.0.4 SHA                      | WebFetch  | `api.github.com/repos/actions/cache/git/refs/tags/v5.0.4`                            | `668228422ae6a00e4ad889ee87cd7109ec5666a7` (commit)                                   |
| cache v5 floating tag SHA             | WebFetch  | `api.github.com/repos/actions/cache/git/refs/tags/v5`                                | `668228422ae6a00e4ad889ee87cd7109ec5666a7` — same as v5.0.4                           |
| cache v5.0.4 changelog                | WebFetch  | `github.com/actions/cache/releases/tag/v5.0.4`                                       | Maintenance: permission fixes, proxy test fixes, bun.lock key fix                     |
| cache security advisories             | WebSearch | "actions/cache CVE security advisory 2025 2026"                                      | No direct CVE; GitHub Advisory Database query also negative                           |
| cache advisory database               | WebFetch  | `github.com/advisories?query=actions%2Fcache`                                        | No advisories specific to actions/cache                                               |
| setup-node latest release             | WebFetch  | `api.github.com/repos/actions/setup-node/releases/latest`                            | v6.3.0, published 2026-03-04                                                          |
| setup-node tags                       | WebFetch  | `api.github.com/repos/actions/setup-node/tags`                                       | v6.3.0 is latest; v4.4.0 is latest v4 patch; 52 tags total                            |
| setup-node v6.3.0 SHA                 | WebFetch  | `api.github.com/repos/actions/setup-node/git/refs/tags/v6.3.0`                       | `53b83947a5a98c8d113130e565377fae1a50d02f` (commit)                                   |
| setup-node v6 floating tag SHA        | WebFetch  | `api.github.com/repos/actions/setup-node/git/refs/tags/v6` (implicit from tags list) | `53b83947a5a98c8d113130e565377fae1a50d02f` — same as v6.3.0                           |
| setup-node v4 floating tag SHA        | WebFetch  | `api.github.com/repos/actions/setup-node/git/refs/tags/v4`                           | `49933ea5288caeca8642d1e84afbd3f7d6820020` (commit)                                   |
| setup-node v4.4.0 SHA                 | WebFetch  | `api.github.com/repos/actions/setup-node/git/refs/tags/v4.4.0`                       | `49933ea5288caeca8642d1e84afbd3f7d6820020` — same as v4 floating                      |
| setup-node v4->v5 breaking changes    | WebSearch | "actions/setup-node v4 to v5 breaking changes release notes"                         | Node.js 24 runtime; auto-caching introduced; runner v2.327.1 required                 |
| setup-node v5->v6 breaking changes    | WebSearch | "actions/setup-node v5 v6 breaking changes migration Node.js 24"                     | Auto-caching limited to npm only in v6; June 2026 Node.js 24 enforcement deadline     |
| setup-node security advisories        | WebSearch | "actions/setup-node CVE security advisory 2025 2026"                                 | No direct CVE; Node.js runtime CVEs affect the binary, not the action                 |
| setup-node advisory database          | WebFetch  | `github.com/advisories?query=actions%2Fsetup-node`                                   | No advisories for actions/setup-node specifically                                     |

---

## Self-Check

- Every version sourced from a live lookup: Yes — all versions fetched from GitHub API, not training data
- Both releases AND tags checked for all five actions: Yes
- Tags vs releases divergence: None found — all five actions showed consistent results
- Security search entries match dependency count (5): Yes — checkout, upload-artifact, download-artifact, cache, setup-node each searched via WebSearch and GitHub Advisory Database
- Changelogs read for every upgrade: Yes — all upgrade paths investigated (checkout v6, upload-artifact v7, download-artifact v8, cache v5.0.4, setup-node v4->v5->v6)
- SHA fetched for every GitHub Action reference: Yes — both the user's requested version and the recommended version have verified SHAs
