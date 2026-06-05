# GitHub Actions SHA Pinning Report

**Task:** Verify five GitHub Actions, obtain commit SHA pins, and check for security issues.

**Date:** 2026-03-23

**Actions under review:**

- `actions/checkout@v6`
- `actions/upload-artifact@v7`
- `actions/download-artifact@v8`
- `actions/cache@v5`
- `actions/setup-node@v4`

---

## Executive Summary

| Action                    | Requested | Latest on Major | Overall Latest | Status                              |
|---------------------------|-----------|-----------------|----------------|-------------------------------------|
| actions/checkout          | v6        | v6.0.2          | v6.0.2         | Current                             |
| actions/upload-artifact   | v7        | v7.0.0          | v7.0.0         | Current                             |
| actions/download-artifact | v8        | v8.0.1          | v8.0.1         | Current                             |
| actions/cache             | v5        | v5.0.4          | v5.0.4         | Current                             |
| actions/setup-node        | v4        | v4.4.0          | v6.3.0         | OUTDATED -- 2 major versions behind |

---

## Findings by Risk Level

### actions/setup-node: v4 -> v6.3.0

**Risk level:** BREAKING-UPGRADE
**Verified via:** WebFetch `api.github.com/repos/actions/setup-node/releases/latest` (v6.3.0, Mar 4, 2026) AND `api.github.com/repos/actions/setup-node/tags` (confirmed v6.3.0 is newest tag)
**What changed:**

- v5.0.0 (Sep 4, 2024): Upgraded the action runtime from Node 20 to Node 24. Introduced automatic dependency caching when a `packageManager` field is present in `package.json`. Requires Actions Runner v2.327.1 or later.
- v6.0.0 (Oct 14, 2024): Narrowed automatic caching to npm only (v5 had attempted broader detection). Other package managers require explicit cache configuration. Requires Actions Runner v2.327.1 or later.
- v6.1.0-v6.3.0: Feature additions and dependency updates; no further breaking changes.

**Breaking changes:** Yes -- two sets:

1. v5 introduces Node 24 runtime requirement (runner v2.327.1+). Self-hosted runners on older versions will fail.
2. v6 changes auto-caching scope: if your workflow relied on v5's broad package-manager detection, caching behavior changes. Other package managers (yarn, pnpm) no longer auto-cache -- you must add explicit `cache:` input or use a dedicated cache action.
3. Node 20 is being deprecated on GitHub-hosted runners beginning June 2, 2026. Running v4 (which uses Node 20 as its runtime) will produce deprecation warnings and will break on that date.

**Migration steps:**

1. Bump version reference to v6.3.0 and update SHA pin.
2. If using non-npm package managers: add `cache: 'yarn'` or `cache: 'pnpm'` explicitly.
3. To disable auto npm caching: add `package-manager-cache: false`.
4. Verify your Actions Runner is v2.327.1 or later (GitHub-hosted runners already are).
5. Test matrix -- v6 recommends Node 20, 22, 24 targets; consider whether your matrix needs updating.

**Security advisories:** No CVEs found specific to `actions/setup-node` itself via WebSearch "actions/setup-node v4 CVE security advisory 2025 2026" and GitHub Advisory Database search. The Node 20 runtime used by v4 has received multiple security patches (CVE-2026-21636, CVE-2025-59466, etc.) that are addressed in Node 24 which v5+ uses.

**Recommendation:** Upgrade to v6.3.0. The Node 20 deprecation deadline of June 2, 2026 makes this urgent -- workflows will break on GitHub-hosted runners after that date. v4 is two major versions behind with no path to fix the Node 20 runtime issue without upgrading.

**Your call:** Upgrade to v6.3.0 before June 2, 2026. If you need to do it in stages, v5.0.0 is an intermediate step, but going directly to v6.3.0 is cleaner.

**SHA pin for v6.3.0 (recommended):**

```yaml
uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
```

**SHA pin for v4.4.0 (if you must stay on v4 temporarily):**

```yaml
uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
```

---

### actions/checkout: v6 (current)

**Status:** Current -- the requested major version (v6) matches the latest release (v6.0.2, Jan 9, 2026).

**Security note -- credential persistence improvement:** v6 introduced a significant security improvement: credentials are now persisted to a file under `$RUNNER_TEMP` instead of directly inside `.git/config`. Previously (v5 and earlier), the `GITHUB_TOKEN` written to `.git/config` could be accidentally packaged and leaked through `actions/upload-artifact` or Docker image builds. In v6, credentials are stored outside the repository directory, mitigating this class of supply-chain exposure. This is a strong reason to ensure you are using v6 (not an older major version).

**Note on CVE-2025-61671:** This CVE (CVSS 9.3) involves workflows using `pull_request_target` combined with checking out untrusted fork code via the merge ref. This is a workflow design pattern vulnerability, not a flaw within the checkout action binary itself. It is not fixed by upgrading `actions/checkout` -- it requires auditing workflow trigger configuration.

**Security advisories:** No CVEs found targeting the `actions/checkout` action binary itself. The credential persistence improvement in v6 is a proactive mitigation, not a response to a specific CVE.

**SHA pin for v6.0.2:**

```yaml
uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
```

---

### actions/upload-artifact: v7 (current)

**Status:** Current -- the requested major version (v7) matches the latest release (v7.0.0, Feb 26, 2026).

**What changed from v6 to v7:**

- ESM module migration (upgraded from CommonJS to ECMAScript modules).
- New `archive: false` parameter: allows uploading a single file directly without zipping. When enabled, the filename becomes the artifact name.
- ESM migration may affect deeply integrated downstream consumers, but standard workflow usage is unaffected.

**Security advisories:** No CVEs found for `actions/upload-artifact` v7 via WebSearch "actions/upload-artifact v7 security advisory CVE 2025 2026". General supply-chain caution: artifacts shared between jobs should not contain credentials. The `actions/checkout@v6` credential-persistence improvement reduces the risk of token leakage into artifacts.

**SHA pin for v7.0.0:**

```yaml
uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0
```

---

### actions/download-artifact: v8 (current)

**Status:** Current -- the requested major version (v8) matches the latest release (v8.0.1, Mar 11, 2026).

**What changed from v7 to v8:**

- ESM module migration.
- Hash mismatch validation is now enforced by default (previously a warning). Configure with `digest-mismatch` parameter if needed.
- Direct downloads no longer auto-unzip non-zipped files (behavioral change from v7).

**Security note -- CVE-2024-42471 (path traversal):** This High-severity advisory (GHSA-cxww-7g56-2vh6) affected `actions/download-artifact` versions 4.0.0-4.1.2 only. The fix was released in v4.1.3. Since you are using v8, you are well beyond the affected range. This CVE is not applicable to your workflow.

**Security advisories:** CVE-2024-42471 not applicable (affected v4.0.0-4.1.2 only). No additional advisories found for v8 via GitHub Advisory Database search.

**SHA pin for v8.0.1:**

```yaml
uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
```

---

### actions/cache: v5 (current)

**Status:** Current -- the requested major version (v5) matches the latest release (v5.0.4, Mar 18, 2026).

**What changed in v5.x patch releases:**

- v5.0.0 (Dec 11, 2024): Upgraded to Node 24 runtime. Requires Actions Runner v2.327.1+.
- v5.0.1 (Dec 12, 2024): Fixed punycode deprecation warning on Node 24.
- v5.0.2 (Jan 16, 2025): Changed retry behavior -- HTTP 429 responses from cache service no longer retried when creating cache entries.
- v5.0.3 (Jan 29, 2025): Dependency security patches (`@actions/cache` v5.0.5, `@actions/core` v2.0.3).
- v5.0.4 (Mar 18, 2026): Additional dependency security patches and documentation fixes.

**Security advisories:** No CVEs found for `actions/cache` v5 via WebSearch "actions/cache v5 security advisory CVE 2025 2026". The v5.0.3 and v5.0.4 patch releases both included dependency-level security patches -- using v5.0.4 (the latest) ensures those patches are included.

**SHA pin for v5.0.4 (recommended -- latest patch):**

```yaml
uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7 # v5.0.4
```

---

## Complete SHA-Pinned Workflow Snippet

Below are all five actions with SHA pins for their respective latest versions. For `setup-node`, both the user-requested v4 pin and the recommended v6 pin are shown.

```yaml
# Recommended -- all current versions with SHA pins
steps:
  - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

  - uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7 # v5.0.4

  # RECOMMENDED: upgrade from v4 to v6.3.0 before June 2, 2026
  - uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
    with:
      node-version: '22'

  # If staying on v4 temporarily (will break on GitHub-hosted runners after June 2, 2026):
  # - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0

  - uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0
    with:
      name: my-artifact
      path: dist/

  - uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
    with:
      name: my-artifact
```

---

## Verification Log

| Claim                                              | Tool                 | Source                                                                                                                                | Finding                                                                                     |
|----------------------------------------------------|----------------------|---------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| actions/checkout latest release                    | WebFetch             | `api.github.com/repos/actions/checkout/releases/latest`                                                                               | v6.0.2, published 2026-01-09                                                                |
| actions/checkout tags                              | WebFetch             | `api.github.com/repos/actions/checkout/tags`                                                                                          | Most recent tag: v6.0.2; releases and tags agree                                            |
| actions/checkout v6.0.2 SHA                        | WebFetch             | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                                                                          | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (lightweight tag, type: commit)                  |
| actions/upload-artifact latest release             | WebFetch             | `api.github.com/repos/actions/upload-artifact/releases/latest`                                                                        | v7.0.0, published 2026-02-26                                                                |
| actions/upload-artifact tags                       | WebFetch             | `api.github.com/repos/actions/upload-artifact/tags`                                                                                   | Most recent tag: v7.0.0; releases and tags agree                                            |
| actions/upload-artifact v7.0.0 SHA                 | WebFetch             | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`                                                                   | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (lightweight tag, type: commit)                  |
| actions/download-artifact latest release           | WebFetch             | `api.github.com/repos/actions/download-artifact/releases/latest`                                                                      | v8.0.1, published 2026-03-11                                                                |
| actions/download-artifact tags                     | WebFetch             | `api.github.com/repos/actions/download-artifact/tags`                                                                                 | Most recent tag: v8.0.1; releases and tags agree                                            |
| actions/download-artifact v8.0.1 SHA               | WebFetch             | `api.github.com/repos/actions/download-artifact/git/refs/tags/v8.0.1`                                                                 | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` (lightweight tag, type: commit)                  |
| actions/cache latest release                       | WebFetch             | `api.github.com/repos/actions/cache/releases/latest`                                                                                  | v5.0.4, published 2026-03-18                                                                |
| actions/cache tags                                 | WebFetch             | `api.github.com/repos/actions/cache/tags`                                                                                             | Most recent tag: v5.0.4; releases and tags agree                                            |
| actions/cache v5.0.4 SHA                           | WebFetch             | `api.github.com/repos/actions/cache/git/refs/tags/v5.0.4`                                                                             | `668228422ae6a00e4ad889ee87cd7109ec5666a7` (lightweight tag, type: commit)                  |
| actions/setup-node latest release                  | WebFetch             | `api.github.com/repos/actions/setup-node/releases/latest`                                                                             | v6.3.0, published 2026-03-04                                                                |
| actions/setup-node tags                            | WebFetch             | `api.github.com/repos/actions/setup-node/tags`                                                                                        | Most recent tag: v6.3.0; latest v4 tag: v4.4.0; releases and tags agree                     |
| actions/setup-node v4.4.0 SHA                      | WebFetch             | `api.github.com/repos/actions/setup-node/git/refs/tags/v4.4.0`                                                                        | `49933ea5288caeca8642d1e84afbd3f7d6820020` (lightweight tag, type: commit)                  |
| actions/setup-node v6.3.0 SHA                      | WebFetch             | `api.github.com/repos/actions/setup-node/git/refs/tags/v6.3.0`                                                                        | `53b83947a5a98c8d113130e565377fae1a50d02f` (lightweight tag, type: commit)                  |
| Security: all five actions CVEs                    | WebSearch            | "actions/checkout actions/upload-artifact actions/download-artifact actions/cache actions/setup-node CVE security advisory 2025 2026" | No direct CVEs on the action binaries; Node 20 deprecation June 2026 confirmed              |
| Security: actions/setup-node v4 specific           | WebSearch            | "actions/setup-node v4 CVE security advisory 2025 2026"                                                                               | No CVEs found specific to the action; Node 20 runtime vulnerabilities noted                 |
| Security: actions/cache v5 specific                | WebSearch            | "actions/cache v5 security advisory CVE 2025 2026"                                                                                    | No CVEs found                                                                               |
| Security: actions/upload-artifact v7 specific      | WebSearch            | "actions/upload-artifact v7 security advisory CVE 2025 2026"                                                                          | No CVEs found                                                                               |
| Security: actions/download-artifact CVE-2024-42471 | WebSearch + WebFetch | `github.com/actions/download-artifact/security/advisories/GHSA-cxww-7g56-2vh6`                                                        | Affects v4.0.0-4.1.2 only; v8 is unaffected                                                 |
| actions/checkout v6 security improvement           | WebSearch            | "actions/checkout v6 persist-credentials security improvement credential leakage advisory"                                            | v6 moves credentials to `$RUNNER_TEMP`; confirmed mitigates credential-in-artifact exposure |
| actions/setup-node v5/v6 breaking changes          | WebSearch + WebFetch | `github.com/actions/setup-node/releases`                                                                                              | v5: Node 24 upgrade, auto-caching added; v6: caching narrowed to npm only                   |
| actions/cache v5 changelog                         | WebFetch             | `github.com/actions/cache/releases`                                                                                                   | Security patches in v5.0.3 and v5.0.4; Node 24 upgrade in v5.0.0                            |
| Node 20 deprecation deadline                       | WebSearch            | "actions/setup-node v5 v6 breaking changes changelog 2025 2026"                                                                       | June 2, 2026 -- GitHub-hosted runners move to Node 24 by default                            |

---

## Self-Check

- Every version sourced from a live lookup: Yes
- Both releases AND tags checked for all five actions: Yes
- Every dependency covered by at least one security search: Yes (shared search covered all five; targeted searches confirmed for setup-node, cache, upload-artifact, and download-artifact)
- Changelogs read for setup-node v5 and v6 (the only action with version drift): Yes
- SHA fetched for every GitHub Action reference: Yes -- six SHAs total (checkout v6.0.2, upload-artifact v7.0.0, download-artifact v8.0.1, cache v5.0.4, setup-node v4.4.0, setup-node v6.3.0)
- All SHAs confirmed as lightweight tags pointing directly to commits (type: commit confirmed for all six via git/refs/tags endpoint)
- No annotated tag resolution required (all type: commit, not type: tag)
- Internal consistency: all sections agree on versions and SHAs
- False contemporaneity claims: not applicable -- this is a new workflow being written, not an existing document with stale labels
