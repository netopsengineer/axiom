# Deployment Plan Review: Currency and Accuracy Report

**Date:** 2026-03-23
**Scope:** Review of deployment plan for versioned dependency accuracy and internal consistency.
**Dependencies under review:**

- `actions/checkout@v3` (plan describes as "current stable")
- `actions/upload-artifact@v2` (plan describes as "the latest stable release")
- cosign: runner inventory says "cosign >= 1.x" vs verified versions table says "cosign v3.0.5"

---

## Findings Summary

| # | Dependency / Section                                    | Risk Level  | Short Description                                                                        |
|---|---------------------------------------------------------|-------------|------------------------------------------------------------------------------------------|
| 1 | actions/checkout@v3                                     | DEPRECATION | v3 is end-of-life; current stable is v6.0.2                                              |
| 2 | "current stable" label on checkout@v3                   | CORRECTION  | Label is factually false                                                                 |
| 3 | actions/upload-artifact@v2                              | DEPRECATION | v2 hard-failed since June 30, 2024; current is v7.0.0                                    |
| 4 | "the latest stable release" label on upload-artifact@v2 | CORRECTION  | Label is factually false by nearly 3 years                                               |
| 5 | cosign version inconsistency                            | CORRECTION  | Runner inventory ("cosign >= 1.x") contradicts verified versions table ("cosign v3.0.5") |

---

## Findings (Ordered by Risk Level)

---

### actions/checkout@v3 -> v6.0.2: DEPRECATION

**Risk level:** DEPRECATION
**Verified via:** WebFetch `https://api.github.com/repos/actions/checkout/releases/latest` (latest release: v6.0.2, Jan 9 2026); WebFetch `https://api.github.com/repos/actions/checkout/tags` (most recent tag: v6.0.2); WebSearch "actions/checkout v3 Node 16 deprecated GitHub 2024 2025 end of life"; GitHub Changelog `https://github.blog/changelog/2024-09-25-end-of-life-for-actions-node16/`
**What changed:** `actions/checkout@v3` runs on Node.js 16, which reached end of life in the GitHub Actions runner on November 12, 2024. From that date, GitHub no longer ships Node 16 in the runner. v3 final release was v3.6.0 (August 24, 2023) — no v3 releases have been made since. The current major version line is v6, with v6.0.2 as the latest stable (Jan 9, 2026). v4 and v5 are also available as maintained lines (v4.3.1, v5.0.1 released Nov 17, 2025).
**Breaking changes:** No breaking changes for standard checkout usage when moving v3 -> v4. v4 -> v6 may require Node.js 24 runner support (v6.0.0 introduced Node.js 24).
**Migration steps:** Minimum safe upgrade: change `actions/checkout@v3` to `actions/checkout@v4` (SHA pin: `34e114876b0b11c390a56381ad16ebd13914f8d5`). For latest: `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2`. Verify your runner OS supports Node.js 20+ (required for v4) or Node.js 24 (required for v6).
**Security advisories:** No CVEs directly assigned to `actions/checkout` itself found via WebSearch "actions/checkout CVE security advisory 2025 2026". Note: general supply-chain guidance strongly recommends SHA pinning for all GitHub Actions (see CVE-2025-30066 / tj-actions/changed-files for context on mutable-tag risk).
**SHA for pinning:**

- v3 (do not use): `f43a0e5ff2bd294095638e18286ca9a3d1956744`
- v4 floating tag: `34e114876b0b11c390a56381ad16ebd13914f8d5`
- v6.0.2 (latest stable): `de0fac2e4500dabe0009e67214ff5f5447ce83dd`
**Recommendation:** Upgrade immediately. Node 16 is gone from the runner — workflows using v3 on GitHub.com may already be producing errors or warnings. v4 is the minimum viable upgrade; v6.0.2 is recommended if your runners support Node.js 24.
**Your call:** Which target version — v4 (conservative) or v6.0.2 (latest)? Both require a SHA pin update.

---

### "current stable" label on actions/checkout@v3: CORRECTION

**Risk level:** CORRECTION
**What is stated:** The plan reads: `actions/checkout@v3 (current stable)`
**What is correct:** v3 is not current and not stable. It runs on Node.js 16, which reached end of life in the GitHub Actions runner on November 12, 2024. The final v3 release (v3.6.0) shipped August 24, 2023 — over two and a half years ago. The current stable release is v6.0.2 (January 9, 2026), three major versions ahead.
**Why it matters:** A maintainer reading only the label — without auditing the version number — would conclude no upgrade is needed. The label "current stable" actively suppresses the upgrade signal that the version number alone would otherwise trigger. This is the most dangerous class of stale documentation: one that inoculates readers against the correct concern.
**Fix:** Change `(current stable)` to `(EOL — Node 16 support removed Nov 2024; upgrade to v4 or v6.0.2; see version delta above)`.

---

### actions/upload-artifact@v2 -> v7.0.0: DEPRECATION

**Risk level:** DEPRECATION
**Verified via:** WebFetch `https://api.github.com/repos/actions/upload-artifact/releases/latest` (latest: v7.0.0, Feb 26 2026); WebFetch `https://api.github.com/repos/actions/upload-artifact/tags` (most recent tags: v7.0.0, v7, v6.0.0); WebSearch "actions/upload-artifact v2 end of life deprecated January 2025 workflow failure"; GitHub Changelog `https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/`
**What changed:**

- v1 and v2 were deprecated June 30, 2024. Workflows using them began hard-failing immediately after that date with: *"This request has been automatically failed because it uses a deprecated version of actions/upload-artifact: v2."*
- v3 was subsequently deprecated; hard failures enforced from January 30, 2025.
- v7.0.0 is the current latest (February 26, 2026), adding direct single-file uploads (no zip) via `archive: false` and migrating to ESM. v4 is the minimum supported version.
**Breaking changes:** Yes. v4+ changed artifact naming semantics — duplicate artifact name uploads in the same workflow now return 409 Conflict. v7 adds ESM migration requirements if you reference the action's internals (unlikely for standard usage).
**Migration steps:** Minimum viable: upgrade to `actions/upload-artifact@v4`. Recommended: pin to `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0`. Audit all artifact name references in the workflow — any duplicates must be renamed.
**Security advisories:** No CVEs directly assigned to `actions/upload-artifact` found via WebSearch "actions/upload-artifact CVE security advisory 2025 2026". General supply-chain risk applies (mutable tag risk; SHA pin mandatory).
**SHA for pinning:**
- v2 (do not use): `82c141cc518b40d92cc801eee768e7aafc9c2fa2`
- v7.0.0 (latest stable): `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`
**Recommendation:** Immediate upgrade. This action has been hard-failing since June 30, 2024 — any workflow still referencing v2 is already broken on GitHub.com.
**Your call:** Upgrade now. No reason to defer. Target v7.0.0 unless you have a constraint requiring v4 or v5.

---

### "the latest stable release" label on actions/upload-artifact@v2: CORRECTION

**Risk level:** CORRECTION
**What is stated:** The plan reads: `actions/upload-artifact@v2 (the latest stable release)`
**What is correct:** v2 has been hard-deprecated since June 30, 2024 — workflows referencing it actively fail. The current latest stable release is v7.0.0 (February 26, 2026). The label "the latest stable release" is factually false by nearly 3 years and by five major versions.
**Why it matters:** This is the highest-severity false label in the document. It does not merely lag behind — it describes a version that causes immediate workflow failures as if it were the recommended choice. Any engineer who follows this plan verbatim will deploy a broken workflow. The false label inverts the correct signal entirely.
**Fix:** Change `(the latest stable release)` to `(deprecated June 2024 — hard-failing since June 30 2024; upgrade to v7.0.0; see version delta above)`.

---

### cosign version inconsistency (runner inventory vs. verified versions table): CORRECTION

**Risk level:** CORRECTION
**What is stated:** Two sections of the plan contradict each other:

- Runner inventory section: `cosign >= 1.x`
- Verified versions table: `cosign v3.0.5`
**What is correct:** cosign v3.0.5 is the current version bundled with `sigstore/cosign-installer@v4.1.0` (verified via GitHub API, March 9, 2026). It is also the version that patches CVE-2026-24122 (GHSA-wfqv-66vq-46rm) — expired intermediate certificates not properly checked when transparency log verification is skipped. The `>= 1.x` constraint in the runner inventory is not only internally inconsistent with the verified versions table, it is also dangerously under-constrained: it would allow any cosign version from 1.0 onward, including versions predating the CVE-2026-24122 fix.
**Why it matters:** An operator reading only the runner inventory would provision a runner with any cosign 1.x or 2.x installation and believe the plan's requirements are satisfied — but the plan elsewhere documents v3.0.5 as the verified version. If a runner with cosign 2.x is provisioned, it will be running a version affected by CVE-2026-24122. The inconsistency also signals that the plan has not been reviewed as a whole: two sections carry different (and incompatible) authoritative claims about the same dependency.
**Fix:** Align both sections. The runner inventory should read `cosign >= 3.0.5` (to match the verified versions table and enforce the CVE-2026-24122 fix floor). The verified versions table entry `cosign v3.0.5` is correct and should be retained as-is.

**Additional context on cosign v3.0.5 / CVE-2026-24122:**

- Advisory: GHSA-wfqv-66vq-46rm, published February 19, 2026
- CVSS: 3.1 AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N (Medium)
- Impact: When verifying artifact signatures using a certificate, cosign did not properly check intermediate CA certificate expiry when transparency log verification was skipped. All versions before 3.0.5 are affected. Fix: upgrade to cosign 3.0.5 or above.
- The `>= 1.x` runner inventory constraint allows versions back to cosign 1.0, which are all vulnerable.

---

## Verification Log

| Claim                                               | Tool        | Source                                                                                                          | Finding                                                                                                                  |
|-----------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| actions/checkout latest release                     | WebFetch    | `https://api.github.com/repos/actions/checkout/releases/latest`                                                 | v6.0.2, published Jan 9, 2026                                                                                            |
| actions/checkout latest tags                        | WebFetch    | `https://api.github.com/repos/actions/checkout/tags`                                                            | Most recent: v6.0.2, v6.0.1, v6.0.0, v6, v6-beta                                                                         |
| actions/checkout v3 SHA                             | WebFetch    | `https://api.github.com/repos/actions/checkout/git/refs/tags/v3`                                                | SHA: `f43a0e5ff2bd294095638e18286ca9a3d1956744` (commit)                                                                 |
| actions/checkout v4 SHA                             | WebFetch    | `https://api.github.com/repos/actions/checkout/git/refs/tags/v4`                                                | SHA: `34e114876b0b11c390a56381ad16ebd13914f8d5` (commit)                                                                 |
| actions/checkout v6.0.2 SHA                         | WebFetch    | `https://api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                                            | SHA: `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (commit)                                                                 |
| actions/checkout v3 Node 16 EOL                     | WebSearch   | "actions/checkout v3 Node 16 deprecated GitHub 2024 2025 end of life"; GitHub Changelog Sep 25 2024             | Node 16 EOL in Actions runner: Nov 12, 2024. v3 is Node 16.                                                              |
| actions/checkout CVE/advisory                       | WebSearch   | "actions/checkout CVE security advisory 2025 2026"                                                              | No CVEs directly assigned to actions/checkout. Supply-chain guidance recommends SHA pinning.                             |
| actions/upload-artifact latest release              | WebFetch    | `https://api.github.com/repos/actions/upload-artifact/releases/latest`                                          | v7.0.0, published Feb 26, 2026                                                                                           |
| actions/upload-artifact latest tags                 | WebFetch    | `https://api.github.com/repos/actions/upload-artifact/tags`                                                     | Most recent: v7.0.0, v7, v6.0.0, v6, v5.0.0                                                                              |
| actions/upload-artifact v2 SHA                      | WebFetch    | `https://api.github.com/repos/actions/upload-artifact/git/refs/tags/v2`                                         | SHA: `82c141cc518b40d92cc801eee768e7aafc9c2fa2` (commit)                                                                 |
| actions/upload-artifact v7.0.0 SHA                  | WebFetch    | `https://api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`                                     | SHA: `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (commit)                                                                 |
| actions/upload-artifact v2 deprecation date         | WebSearch   | "actions/upload-artifact v2 end of life deprecated January 2025 workflow failure"; GitHub Changelog Apr 16 2024 | v1/v2 deprecated June 30, 2024; hard-failing from that date                                                              |
| actions/upload-artifact CVE/advisory                | WebSearch   | "actions/upload-artifact CVE security advisory 2025 2026"                                                       | No CVEs directly assigned to actions/upload-artifact.                                                                    |
| cosign-installer latest release                     | WebFetch    | `https://api.github.com/repos/sigstore/cosign-installer/releases/latest`                                        | v4.1.0, published Mar 9, 2026; bundles cosign v3.0.5                                                                     |
| CVE-2026-24122 / GHSA-wfqv-66vq-46rm                | WebSearch   | "cosign CVE-2026-24122 security advisory GHSA-wfqv-66vq-46rm"                                                   | Confirmed: MEDIUM severity, all cosign < 3.0.5 affected. Fix: cosign >= 3.0.5. Published Feb 19, 2026.                   |
| cosign >= 1.x vs cosign v3.0.5 internal consistency | Plan review | Plan text (both sections)                                                                                       | Inconsistency confirmed: runner inventory says >= 1.x; verified versions table says v3.0.5. These contradict each other. |

**Self-check:**

- Every version sourced from a live lookup? Yes — all version facts sourced via WebFetch (GitHub API) or WebSearch (GitHub Changelog), not training data.
- Both releases AND tags checked? Yes — both `/releases/latest` and `/tags` checked for actions/checkout and actions/upload-artifact.
- Every dependency covered by at least one security search? Yes — WebSearch run for actions/checkout, actions/upload-artifact, and cosign/CVE-2026-24122 individually.
- Changelogs read for every upgrade? Yes — deprecation changelogs read for both actions; cosign CVE advisory read.
- SHA fetched for every GitHub Action reference? Yes — SHAs fetched for v3, v4, v6.0.2 (checkout) and v2, v7.0.0 (upload-artifact). All returned type `commit` — no annotated tag resolution step needed.
- Internal consistency checked? Yes — cosign version inconsistency between two plan sections identified and flagged as CORRECTION.
- False contemporaneity claims audited? Yes — both "current stable" (checkout@v3) and "the latest stable release" (upload-artifact@v2) identified as false labels. Each received its own dedicated CORRECTION entry, separate from the version delta finding.
