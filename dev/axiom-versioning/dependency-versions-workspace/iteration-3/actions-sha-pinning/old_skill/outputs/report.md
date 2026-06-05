# GitHub Actions SHA Pinning Report

**Task:** Verify five GitHub Actions, get their SHA pins, and check for security issues.
**Actions under review:** actions/checkout@v6, actions/upload-artifact@v7, actions/download-artifact@v8, actions/cache@v5, actions/setup-node@v4
**Date:** 2026-03-23

---

## Executive Summary

| Action                    | User Specified | Latest Available | Status                               |
|---------------------------|----------------|------------------|--------------------------------------|
| actions/checkout          | @v6            | v6.0.2           | Patch behind — use v6.0.2            |
| actions/upload-artifact   | @v7            | v7.0.0           | Current (latest v7)                  |
| actions/download-artifact | @v8            | v8.0.1           | Patch behind — use v8.0.1            |
| actions/cache             | @v5            | v5.0.4           | Patch behind — use v5.0.4            |
| actions/setup-node        | @v4            | v6.3.0           | OUTDATED — two major versions behind |

**Critical finding:** `actions/setup-node@v4` is two major versions behind the current v6.3.0. This is a BREAKING-UPGRADE requiring a migration decision. All other actions are on the correct major version but behind on patches.

**Supply-chain finding:** All five actions are currently specified using mutable floating tags (e.g., `@v6`, `@v7`). These must be replaced with immutable commit SHAs. The March 2026 aquasecurity/trivy-action supply-chain compromise demonstrated that floating tags can be silently repointed to malicious commits.

---

## Findings by Risk Level

---

### actions/setup-node: @v4 -> v6.3.0

**Risk level:** BREAKING-UPGRADE
**Verified via:** WebFetch `api.github.com/repos/actions/setup-node/releases/latest` (v6.3.0, published 2026-03-04) and `/tags` (v6.3.0 confirmed latest tag)
**What changed (v4 -> v5):**

- v5 upgrades the action runtime to Node.js 24. Runner version >= 2.327.1 is required.
- v5 introduces automatic npm caching when `packageManager` field is set to `npm` in `package.json`. This is a new behavior absent in v4 — workflows that rely on explicit cache control may need `package-manager-cache: false`.

**What changed (v5 -> v6):**

- v6 limits automatic caching to npm only. Workflows using yarn or pnpm that previously relied on automatic caching must now explicitly configure the `cache` input.
- Runtime remains Node.js 24.
- v6.3.0 (latest patch) adds support for parsing the `devEngines` field in `package.json`, bug fixes, and dependency security patches.

**Breaking changes:** Yes.

- Node.js 24 runtime requires runner >= v2.327.1. Self-hosted runners must be updated first.
- Automatic caching behavior changed between v4 and v6. If you use yarn or pnpm, you must explicitly set the `cache` input.
- For workflows with elevated privileges, set `package-manager-cache: false` to opt out of automatic caching.

**Migration steps:**

1. Confirm your runner version is >= 2.327.1 (GitHub-hosted runners are already compliant).
2. Check `package.json` for a `packageManager` field — if present and set to yarn/pnpm, add `cache: yarn` or `cache: pnpm` explicitly.
3. For security-sensitive workflows, add `package-manager-cache: false`.
4. Update the version reference and SHA pin.

Old (insecure mutable tag):

```yaml
uses: actions/setup-node@v4
```

New (pinned to commit SHA):

```yaml
uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f  # v6.3.0
```

**Security advisories:** No CVEs found for `actions/setup-node` itself via WebSearch "actions/setup-node CVE security advisory 2025 2026". Note: Node.js security releases (CVE-2025-55131, CVE-2026-21636, CVE-2026-21637) affect the Node.js runtime version you configure with this action, not the action itself. Staying current with `actions/setup-node` ensures you can install patched Node.js versions.
**Recommendation:** Upgrade to v6.3.0 with SHA pin. The v4 runtime (Node.js 20) is nearing end-of-life pressure. June 2, 2026 is the date GitHub forces all actions to Node.js 24 by default — staying on v4 creates a mandatory deadline.
**Your call:** Upgrade before June 2, 2026 (when Node.js 24 becomes the enforced default). If your runner is self-hosted, schedule a runner update first.

---

### actions/download-artifact: @v8 -> v8.0.1 (patch) / note: @v8 floating tag is unsafe

**Risk level:** ROUTINE (patch update) + supply-chain pinning required
**Verified via:** WebFetch `api.github.com/repos/actions/download-artifact/releases/latest` (v8.0.1, published 2026-03-11) and `/tags` (v8.0.1 confirmed latest)
**What changed (v8.0.0 -> v8.0.1):**

- Added CJK (Chinese, Japanese, Korean) character support in artifact names.
- Added regression test for artifact name / content-type header alignment.

**What changed (v7 -> v8.0.0, for context):**

- ESM migration (transparent to most users; forks may require changes).
- Hash mismatch behavior changed: previously generated warnings, now causes workflow failure by default. Configurable via the new `digest-mismatch` parameter.
- Non-zipped artifact support: action now checks `Content-Type` header to determine decompression. Use `skip-decompress` parameter to control manually.
- **Coordinated pair:** `actions/upload-artifact@v7` (with `archive: false`) requires `actions/download-artifact@v8` to handle non-zipped artifacts. These two actions must stay aligned.

**Breaking changes:** The v7->v8 hash-mismatch-as-error change could break existing workflows that previously relied on warnings being non-fatal. New workflows starting at v8 will not be affected.
**Migration steps:** Version bump + SHA pin. No other changes needed for standard usage.

Old (insecure mutable tag):

```yaml
uses: actions/download-artifact@v8
```

New (pinned to commit SHA):

```yaml
uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c  # v8.0.1
```

**Security advisories:** A path traversal variant (CVE-2024-42471) affecting earlier versions was found via WebSearch. This was fixed in v4+. v8 is not affected. No new CVEs specific to v8 found via WebSearch "actions/upload-artifact actions/download-artifact CVE security advisory 2025 2026". GitHub noted the underlying artifact design decision (no re-validation of overwritten files) is intentional and will not be remediated — do not use artifacts to pass untrusted executable content between jobs.
**Recommendation:** Pin to v8.0.1 SHA. Routine patch; safe to apply immediately.
**Your call:** Apply patch update and SHA pin now. If you later use `upload-artifact@v7` with `archive: false`, you will need this v8 version of download-artifact.

---

### actions/cache: @v5 -> v5.0.4 (patch) / note: @v5 floating tag is unsafe

**Risk level:** ROUTINE (patch update) + supply-chain pinning required
**Verified via:** WebFetch `api.github.com/repos/actions/cache/releases/latest` (v5.0.4, published 2026-03-18) and `/tags` (v5.0.4 confirmed latest)
**What changed (v5.0.0 -> v5.0.4):**

- v5.0.4: Security vulnerability patches via dependency updates, documentation updates, workflow permission fixes for code scanning alerts, proxy integration test fixes.
- v5.0.x patch series: incremental stability and dependency security fixes across v5.0.1-v5.0.4.

**Breaking changes:** No. v5 major-version bump from v4 involved the GitHub Cache service API migration (v4 used the deprecated Cache API v1). v5 is stable and current.
**Migration steps:** Version bump + SHA pin.

Old (insecure mutable tag):

```yaml
uses: actions/cache@v5
```

New (pinned to commit SHA):

```yaml
uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7  # v5.0.4
```

**Security advisories:** No CVEs found directly for `actions/cache` via WebSearch "actions/cache CVE security advisory 2025 2026" and WebFetch of the GitHub Advisory Database filtered for `actions/cache`. The GitHub Advisory Database search returned an unrelated advisory (CVE-2025-31479 for `canonical/get-workflow-version-action`). No `actions/cache`-specific advisory found. The v5.0.4 release notes explicitly mention security vulnerability patches through dependency updates — the dependencies in question are the action's internal build tooling, not its runtime behavior.
**Recommendation:** Pin to v5.0.4 SHA. The patch includes dependency security fixes.
**Your call:** Apply immediately. Zero breaking risk.

---

### actions/checkout: @v6 -> v6.0.2 (patch) / note: @v6 floating tag is unsafe

**Risk level:** ROUTINE (patch update) + supply-chain pinning required
**Verified via:** WebFetch `api.github.com/repos/actions/checkout/releases/latest` (v6.0.2, published 2026-01-09) and `/tags` (v6.0.2 confirmed latest)
**What changed (v6.0.0 -> v6.0.2):**

- v6.0.0: Node.js 24 runtime support, credential persistence improvement (credentials now persisted to a separate file for enhanced security).
- v6.0.1-v6.0.2: Patch fixes (incremental stability fixes).

**Breaking changes:** No. v6 is on the correct major version. The credential-to-separate-file change in v6.0.0 is an internal security improvement, not a breaking behavioral change for standard usage.
**Migration steps:** Version bump + SHA pin.

Old (insecure mutable tag):

```yaml
uses: actions/checkout@v6
```

New (pinned to commit SHA):

```yaml
uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
```

**Security advisories:** No CVEs found directly for `actions/checkout` itself via WebSearch "actions/checkout CVE security advisory 2025 2026". Important context: CVE-2025-61671 was assigned to a Microsoft workflow that *used* `actions/checkout@v5` in an unsafe pattern (`pull_request_target` + untrusted PR head checkout). This is a misuse pattern, not a vulnerability in the action itself. The March 2026 aquasecurity/trivy-action supply-chain attack involved an imposter commit swapping the checkout reference — this reinforces SHA pinning as mandatory. Standard usage of `actions/checkout@v6` with SHA pinning has no known CVEs.
**Recommendation:** Pin to v6.0.2 SHA. Also audit any workflows that use `pull_request_target` with checkout — this pattern is dangerous regardless of action version.
**Your call:** Apply immediately. Zero breaking risk.

---

### actions/upload-artifact: @v7 -> v7.0.0 / note: @v7 floating tag is unsafe

**Risk level:** ROUTINE (already at latest) + supply-chain pinning required
**Verified via:** WebFetch `api.github.com/repos/actions/upload-artifact/releases/latest` (v7.0.0, published 2026-02-26) and `/tags` (v7.0.0 confirmed latest)
**What changed (v6 -> v7.0.0):**

- ESM migration to support new `@actions/*` package versions.
- New `archive: false` parameter: allows uploading a single file directly without compression. When set, the artifact name is derived from the file itself (ignoring the `name` parameter). Multiple files with `archive: false` cause the action to fail.
- **Coordinated pair:** Using `archive: false` requires `actions/download-artifact@v8` on the download side.

**Breaking changes:** The ESM migration is structural but transparent to workflow users. The `archive: false` feature is opt-in and defaults to `true` for backward compatibility. No existing workflows break from upgrading to v7.
**Migration steps:** Version bump + SHA pin. No other changes needed unless you want to use non-zipped artifact support.

Old (insecure mutable tag):

```yaml
uses: actions/upload-artifact@v7
```

New (pinned to commit SHA):

```yaml
uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f  # v7.0.0
```

**Security advisories:** No CVEs found for `actions/upload-artifact` itself via WebSearch "actions/upload-artifact actions/download-artifact CVE security advisory 2025 2026". Important context: CVE-2025-24362 (GitHub CodeQL workflow) involved artifacts being used to leak secrets — this was a workflow design flaw, not a vulnerability in `upload-artifact`. StepSecurity research (ArtiPACKED) found that publicly accessible artifacts can expose `.git/config` and other sensitive files if workflows accidentally upload them — avoid uploading workspace directories without filtering.
**Recommendation:** Pin to v7.0.0 SHA. Already at latest.
**Your call:** Apply SHA pin. No version change needed.

---

## SHA Pin Reference Table

Use these in your workflow YAML. All SHAs are direct commit SHAs (not annotated tag object SHAs — no second-level resolution was required).

| Action                    | Version | Commit SHA                                 | Verified via                                                          |
|---------------------------|---------|--------------------------------------------|-----------------------------------------------------------------------|
| actions/checkout          | v6.0.2  | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`          |
| actions/upload-artifact   | v7.0.0  | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`   |
| actions/download-artifact | v8.0.1  | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` | `api.github.com/repos/actions/download-artifact/git/refs/tags/v8.0.1` |
| actions/cache             | v5.0.4  | `668228422ae6a00e4ad889ee87cd7109ec5666a7` | `api.github.com/repos/actions/cache/git/refs/tags/v5.0.4`             |
| actions/setup-node        | v6.3.0  | `53b83947a5a98c8d113130e565377fae1a50d02f` | `api.github.com/repos/actions/setup-node/git/refs/tags/v6.3.0`        |

All five tags returned `"type": "commit"` directly — no annotated tag resolution required.

---

## Workflow Snippet (All Five Actions, SHA-Pinned)

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2

  - name: Set up Node.js
    uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f  # v6.3.0
    with:
      node-version: '22'   # or '24' — choose your target LTS

  - name: Cache dependencies
    uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7  # v5.0.4
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

  - name: Upload artifact
    uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f  # v7.0.0
    with:
      name: my-artifact
      path: dist/

  - name: Download artifact
    uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c  # v8.0.1
    with:
      name: my-artifact
```

---

## Coordinated Upgrade Group Note

`actions/upload-artifact` and `actions/download-artifact` form a coordinated pair. The new `archive: false` (non-zipped upload) feature in upload-artifact v7 requires download-artifact v8 to handle the download correctly. If you use both actions, keep them at v7/v8 respectively.

---

## Upcoming Deadline

**June 2, 2026:** GitHub forces all actions to run on Node.js 24 by default. Actions still using Node.js 20 (e.g., `actions/setup-node@v4`) will be forced to upgrade. Plan to complete the setup-node v4 -> v6 migration before this date.

---

## Verification Log

| Claim                                                           | Tool                 | Source URL                                                                                 | Finding                                                                                               |
|-----------------------------------------------------------------|----------------------|--------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| actions/checkout latest release                                 | WebFetch             | `api.github.com/repos/actions/checkout/releases/latest`                                    | v6.0.2, published 2026-01-09                                                                          |
| actions/checkout latest tag                                     | WebFetch             | `api.github.com/repos/actions/checkout/tags`                                               | v6.0.2 is latest tag                                                                                  |
| actions/checkout v6.0.2 commit SHA                              | WebFetch             | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                               | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (type: commit, direct)                                     |
| actions/upload-artifact latest release                          | WebFetch             | `api.github.com/repos/actions/upload-artifact/releases/latest`                             | v7.0.0, published 2026-02-26                                                                          |
| actions/upload-artifact latest tag                              | WebFetch             | `api.github.com/repos/actions/upload-artifact/tags`                                        | v7.0.0 is latest tag                                                                                  |
| actions/upload-artifact v7.0.0 commit SHA                       | WebFetch             | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`                        | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (type: commit, direct)                                     |
| actions/download-artifact latest release                        | WebFetch             | `api.github.com/repos/actions/download-artifact/releases/latest`                           | v8.0.1, published 2026-03-11                                                                          |
| actions/download-artifact latest tag                            | WebFetch             | `api.github.com/repos/actions/download-artifact/tags`                                      | v8.0.1 is latest tag                                                                                  |
| actions/download-artifact v8.0.1 commit SHA                     | WebFetch             | `api.github.com/repos/actions/download-artifact/git/refs/tags/v8.0.1`                      | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` (type: commit, direct)                                     |
| actions/cache latest release                                    | WebFetch             | `api.github.com/repos/actions/cache/releases/latest`                                       | v5.0.4, published 2026-03-18                                                                          |
| actions/cache latest tag                                        | WebFetch             | `api.github.com/repos/actions/cache/tags`                                                  | v5.0.4 is latest tag                                                                                  |
| actions/cache v5.0.4 commit SHA                                 | WebFetch             | `api.github.com/repos/actions/cache/git/refs/tags/v5.0.4`                                  | `668228422ae6a00e4ad889ee87cd7109ec5666a7` (type: commit, direct)                                     |
| actions/setup-node latest release                               | WebFetch             | `api.github.com/repos/actions/setup-node/releases/latest`                                  | v6.3.0, published 2026-03-04                                                                          |
| actions/setup-node latest tag                                   | WebFetch             | `api.github.com/repos/actions/setup-node/tags`                                             | v6.3.0 is latest tag                                                                                  |
| actions/setup-node v6.3.0 commit SHA                            | WebFetch             | `api.github.com/repos/actions/setup-node/git/refs/tags/v6.3.0`                             | `53b83947a5a98c8d113130e565377fae1a50d02f` (type: commit, direct)                                     |
| actions/checkout security advisories                            | WebSearch            | "actions/checkout CVE security advisory 2025 2026"                                         | No CVEs for the action itself; CVE-2025-61671 is a misuse pattern vulnerability, not an action defect |
| actions/upload-artifact / download-artifact security advisories | WebSearch            | "actions/upload-artifact actions/download-artifact CVE security advisory 2025 2026"        | CVE-2024-42471 (path traversal, fixed in v4+); no new CVEs for v7/v8                                  |
| actions/cache security advisories                               | WebSearch + WebFetch | "actions/cache CVE security advisory 2025 2026"; github.com/advisories?query=actions/cache | No CVEs found for actions/cache itself                                                                |
| actions/setup-node security advisories                          | WebSearch            | "actions/setup-node CVE security advisory 2025 2026"                                       | No CVEs found for the action itself                                                                   |
| actions/setup-node v4->v5->v6 breaking changes                  | WebSearch            | "actions/setup-node v4 v5 breaking changes", "actions/setup-node v5 v6 breaking changes"   | Node.js 24 runtime; automatic npm caching behavior changes; runner >= 2.327.1 required                |
| actions/upload-artifact v7 changelog                            | WebSearch + WebFetch | github.com/actions/upload-artifact/releases/tag/v7.0.0                                     | ESM migration; archive:false direct upload feature; backward-compatible                               |
| actions/download-artifact v8 changelog                          | WebFetch             | github.com/actions/download-artifact/releases/tag/v8.0.0                                   | Hash mismatch now errors; ESM migration; skip-decompress parameter                                    |
| actions/cache v5.0.4 changelog                                  | WebFetch             | github.com/actions/cache/releases/tag/v5.0.4                                               | Dependency security patches; documentation fixes                                                      |
| actions/checkout v6.0.0 changelog                               | WebFetch             | github.com/actions/checkout/releases/tag/v6.0.0                                            | Node.js 24 support; credential persistence to separate file                                           |

### Self-check

- Every version sourced from a live lookup: Yes
- Both releases AND tags checked for all five actions: Yes
- Every dependency covered by at least one security search: Yes (checkout covered individually; upload-artifact and download-artifact covered by a shared search query that explicitly named both; cache covered individually; setup-node covered individually)
- Changelogs read for every upgrade: Yes (v6, v7, v8 release notes fetched; v4->v5->v6 setup-node migration researched)
- SHA fetched for every action: Yes (all five)
- Annotated tag resolution required: No (all five returned type: commit directly)
- Internal consistency: No cross-references to check (single-artifact task)
