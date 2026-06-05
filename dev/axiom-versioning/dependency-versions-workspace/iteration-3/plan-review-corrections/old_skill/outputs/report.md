# Deployment Plan Review Report

**Reviewed:** 2026-03-23
**Skill:** dependency-versions (iteration-2 snapshot)
**Task:** Review deployment plan for currency and accuracy of GitHub Action pins and cosign version references.

---

## Summary

Four issues were found: one DEPRECATION-level (active CI failure), one BREAKING-UPGRADE (stale but functional), one CORRECTION (internal inconsistency), and one CORRECTION (false label on a live version). The plan also lacks SHA pinning on both action references, which is a mandatory supply-chain control given recent incidents.

---

## Findings by Priority

---

### 1. actions/upload-artifact@v2: DEPRECATION — Active CI Failure

**Risk level:** DEPRECATION
**Verified via:** WebFetch `api.github.com/repos/actions/upload-artifact/releases/latest` (current: v7.0.0, released 2026-02-26); WebFetch `api.github.com/repos/actions/upload-artifact/tags` (confirms v7.0.0 as latest tag); WebSearch "actions/upload-artifact v2 deprecated end of life removed 2024"
**What is stated in plan:** `actions/upload-artifact@v2` described as "the latest stable release"
**What is correct:** v2 is not the latest stable release. The current latest is v7.0.0. v1 and v2 were deprecated on June 30, 2024. GitHub enforces this hard: any workflow using `actions/upload-artifact@v2` on github.com will produce `Error: This request has been automatically failed because it uses a deprecated version of actions/upload-artifact: v2` and the job will fail. The plan's description of v2 as "the latest stable release" is false — it is the oldest deprecated release.
**Breaking changes:** v2 -> v7 spans five major versions. Key changes:

- v3->v4: New Artifacts API (up to 98% speed improvement), hidden files excluded by default from v4.4+, see MIGRATION.md
- v4->v5: Node.js 24 preliminary support, unzipped single-file upload via `archive: false` parameter
- v5->v6: Full Node.js 24 runtime (`runs.using: node24`), requires runner >= 2.327.1
- v6->v7: ESM upgrade to support newer `@actions/*` packages
**Migration steps:** Update to `actions/upload-artifact@v7.0.0` (SHA pin: `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`). Review MIGRATION.md for v3->v4 changes (hidden files, API differences). If using self-hosted runners, ensure runner version >= 2.327.1 before moving to v6+.
**Security advisories:** No dedicated CVE assigned directly to upload-artifact itself. v2 was implicated in the tj-actions/changed-files supply chain attack (CVE-2025-30066) as the exfiltration mechanism, but this is a usage pattern issue, not a vulnerability in the action itself. No advisories found via WebSearch "actions/upload-artifact CVE security advisory 2025 2026".
**Recommendation:** Mandatory update. v2 causes workflow failures on github.com today. The plan labeling it "the latest stable release" must be corrected immediately — it is the furthest thing from that.
**Your call:** Migrate to v4 minimum (supported, stable). v6 or v7 preferred for Node.js 24 and latest features. If on self-hosted runners, confirm runner version >= 2.327.1 before upgrading past v5. SHA pin to use: `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0`

---

### 2. actions/checkout@v3: BREAKING-UPGRADE — Three Major Versions Behind

**Risk level:** BREAKING-UPGRADE
**Verified via:** WebFetch `api.github.com/repos/actions/checkout/releases/latest` (current: v6.0.2, released 2026-01-09); WebFetch `api.github.com/repos/actions/checkout/tags` (confirms v6.0.2 as latest tag)
**What is stated in plan:** `actions/checkout@v3` described as "current stable"
**What is correct:** v3 is not current stable. Current stable is v6.0.2. v3 was superseded by three major versions. Unlike upload-artifact, checkout v3 does not appear to be actively blocked on github.com, but describing it as "current stable" is materially false and will mislead any reader acting on the plan.
**Breaking changes (v3 -> v6):**

- v3->v4: Node.js runtime upgrade; new `ref` and `commit` outputs added
- v4->v5: Node.js 24 support; multi-repo internal checkout support
- v5->v6: Credentials persisted to a separate file (not `.git/config`) using `includeIf` directives. Not a breaking change for most standard workflows, but workflows that introspect `.git/config` directly may need adjustment.
**Migration steps:** Update version tag to v6 and update SHA pin. For most workflows: version bump only. Verify no workflow steps read credentials directly from `.git/config`.
**Security advisories:** No CVEs found directly in actions/checkout itself via WebSearch "actions/checkout CVE security advisory 2025 2026". Note: CVE-2025-61671 involves unsafe `pull_request_target` patterns with actions/checkout — this is a workflow misuse pattern, not a vulnerability in the action itself. SHA pinning is strongly recommended given the March 2026 trivy-action supply chain compromise, which involved tag repointing.
**Recommendation:** Update to v6.0.2 with SHA pin. The "current stable" label in the plan must be corrected.
**Your call:** Update to v6 (version bump, low risk for most workflows). SHA pin to use: `de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2`

---

### 3. cosign version cross-reference: CORRECTION — Internal Inconsistency

**Risk level:** CORRECTION
**What is stated:** The plan contains two sections referencing cosign with contradictory requirements: the runner inventory section states `cosign >= 1.x`, while the verified versions table states `cosign v3.0.5`.
**What is correct:** These two values cannot both be correct simultaneously as a specification. cosign v3.0.5 is the current latest release (verified via WebFetch `api.github.com/repos/sigstore/cosign/releases/latest`, released 2026-02-19). The v3.0.5 value in the verified versions table is accurate. The `>= 1.x` floor in the runner inventory is dangerously permissive — cosign v1.x is years old and does not include fixes for CVE-2026-24122 (improper certificate validation, fixed in v3.0.5) or earlier CVEs (CVE-2023-46737, CVE-2022-36056, CVE-2022-35929). A runner meeting `>= 1.x` could satisfy the inventory check while being many major versions behind the verified versions table.
**Why it matters:** Any operator reading only the runner inventory section would consider a cosign v1.x or v2.x installation compliant, missing multiple security fixes. The inconsistency also signals that the plan was written or edited piecemeal without a consistency pass. Future maintainers cannot trust the plan's version specifications.
**Fix:** Update the runner inventory section to read `cosign >= 3.0.5` (or `cosign v3.0.5` to match the verified versions table exactly). Both sections must specify the same minimum version.

---

### 4. SHA Pinning Absent: CORRECTION — Supply-Chain Control Missing

**Risk level:** CORRECTION
**What is stated:** Both action references use mutable version tags: `actions/checkout@v3` and `actions/upload-artifact@v2`.
**What is correct:** Mutable version tags (e.g., `@v3`, `@v2`) can be silently repointed to a different commit. This is the exact attack mechanism used in the March 2026 trivy-action supply chain compromise, where 76 of 77 version tags were force-repointed to malicious commits, and the earlier tj-actions/changed-files incident (CVE-2025-30066). SHA pinning is mandatory per the skill invariants and is industry-standard practice for production CI/CD.
**Why it matters:** Even if the plan is updated to current versions, using mutable tags leaves the workflow vulnerable to tag-repointing attacks. SHA pinning ensures the exact commit is locked.
**Fix:** Replace mutable tags with full commit SHAs (with the version as a comment):

Current recommended pins (verified 2026-03-23):

- `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2`
- `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0`

For historical reference only (do not use — v3 is stale, v2 is deprecated and causes CI failures):

- `actions/checkout@v3` resolves to SHA `f43a0e5ff2bd294095638e18286ca9a3d1956744`
- `actions/upload-artifact@v2` resolves to SHA `82c141cc518b40d92cc801eee768e7aafc9c2fa2`

---

## Verification Log

| Claim                                          | Tool      | Source                                                                        | Finding                                                                                                                                             |
|------------------------------------------------|-----------|-------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| actions/checkout current latest release        | WebFetch  | `api.github.com/repos/actions/checkout/releases/latest`                       | v6.0.2 (released 2026-01-09)                                                                                                                        |
| actions/checkout current latest tag            | WebFetch  | `api.github.com/repos/actions/checkout/tags`                                  | v6.0.2 = commit `de0fac2e4500dabe0009e67214ff5f5447ce83dd`                                                                                          |
| actions/checkout@v3 SHA                        | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v3`                      | `f43a0e5ff2bd294095638e18286ca9a3d1956744` (commit, direct)                                                                                         |
| actions/upload-artifact current latest release | WebFetch  | `api.github.com/repos/actions/upload-artifact/releases/latest`                | v7.0.0 (released 2026-02-26)                                                                                                                        |
| actions/upload-artifact current latest tags    | WebFetch  | `api.github.com/repos/actions/upload-artifact/tags`                           | v7.0.0 confirmed as latest                                                                                                                          |
| actions/upload-artifact@v2 SHA                 | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v2`               | `82c141cc518b40d92cc801eee768e7aafc9c2fa2` (commit, direct)                                                                                         |
| actions/upload-artifact@v7.0.0 SHA             | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`           | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (commit, direct)                                                                                         |
| actions/upload-artifact v2 deprecation status  | WebSearch | "actions/upload-artifact v2 deprecated end of life removed 2024"              | v1/v2 deprecated June 30, 2024; active workflow failures enforced on github.com                                                                     |
| cosign current latest release                  | WebFetch  | `api.github.com/repos/sigstore/cosign/releases/latest`                        | v3.0.5 (released 2026-02-19)                                                                                                                        |
| actions/checkout security advisories           | WebSearch | "actions/checkout CVE security advisory 2025 2026"                            | No CVEs in the action itself; CVE-2025-61671 is a workflow misuse pattern; SHA pinning strongly recommended post-trivy-action incident (March 2026) |
| actions/upload-artifact security advisories    | WebSearch | "actions/upload-artifact CVE security advisory 2025 2026"                     | No dedicated CVE; implicated as exfiltration vector in CVE-2025-30066 attack chain                                                                  |
| cosign security advisories                     | WebSearch | "sigstore cosign CVE security advisory 2025 2026"                             | CVE-2026-24122 (GHSA-wfqv-66vq-46rm) — fixed in v3.0.5; cosign v1.x and v2.x are unpatched for this and earlier CVEs                                |
| actions/checkout changelog v3->v6              | WebSearch | "actions/checkout v4 v5 v6 breaking changes migration guide changelog"        | v3->v4: Node runtime + new outputs; v4->v5: Node 24; v5->v6: credentials to separate file via includeIf                                             |
| actions/upload-artifact changelog v2->v7       | WebSearch | "actions/upload-artifact v3 v4 v5 v6 v7 breaking changes migration changelog" | v3->v4 breaking (new Artifacts API, hidden files excluded); v5->v6 requires runner >= 2.327.1; v6->v7 ESM upgrade                                   |

Self-check:

- Every version sourced from a live lookup: YES
- Both releases AND tags checked: YES (for both actions/checkout and actions/upload-artifact)
- Every dependency covered by at least one security search: YES (checkout, upload-artifact, cosign each have dedicated searches)
- Changelogs read for every upgrade: YES
- SHA fetched for every GitHub Action reference: YES (both current versions and plan versions)
- Annotated tags resolved to commit SHA: Not applicable — all tags returned type "commit" directly, no second lookup needed
- Internal consistency check: YES — cosign cross-reference inconsistency flagged as CORRECTION
