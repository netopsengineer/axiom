# Deployment Plan Review: Currency and Accuracy Report

**Review date:** 2026-03-23
**Reviewer:** Dependency Versions skill (dependency-versions)
**Scope:** Three claims reviewed — two GitHub Actions version pins and one cosign version inconsistency.

---

## Summary of Issues Found

The plan contains **four distinct issues**:

1. `actions/checkout@v3` is not current stable — it is three major versions behind the current release.
2. `actions/upload-artifact@v2` is not the latest stable release — it is deprecated, broken on github.com as of January 30 2025, and five major versions behind.
3. Neither action is SHA-pinned, violating supply-chain hygiene for mutable tags.
4. The plan contains an **internal contradiction** on cosign: the runner inventory says `cosign >= 1.x` while the verified versions table says `cosign v3.0.5`. These are inconsistent — and `>= 1.x` includes versions that are deprecated and contain unfixed CVEs.

---

## Issue 1: actions/checkout@v3 — described as "current stable"

### actions/checkout: v3 -> v6.0.2

**Risk level:** BREAKING-UPGRADE (v3 is functionally abandoned; v4, v5, v6 all released since)
**Verified via:** GitHub API — `api.github.com/repos/actions/checkout/releases/latest` and `/tags`
**What changed:**

- v4: Node.js runtime updated, various credential handling improvements.
- v5: Further runtime and runner improvements.
- v6 (current): `persist-credentials` now stores credentials in a separate file under `$RUNNER_TEMP` instead of directly in `.git/config`. Requires minimum Actions Runner v2.327.1 (general) or v2.329.0 (Docker container action scenarios). Added Node.js 24 support.
- v6.0.1 (patch): Fixed worktree support for `persist-credentials` `includeIf`.
- v6.0.2 (latest, 2026-01-09): Added orchestration ID support in git user-agent; improved tag handling for annotations and explicit fetch-tags.

**Breaking changes:**

- For most standard workflows: no changes needed — simple version bump.
- For Docker container actions: requires Actions Runner >= v2.329.0, or stay on v5 temporarily.
- For non-GitHub runners (Gitea/Forgejo): v6 uses hardcoded GitHub paths in `includeIf` directives and is known to break authentication on those platforms.

**Migration steps:** Replace `actions/checkout@v3` with `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd` (SHA for v6.0.2). For Docker container actions, verify runner version first.

**Security advisories:** No CVE specific to `actions/checkout` itself found. However, the broader supply-chain threat is significant: mutable tags on GitHub Actions were weaponized in the March 2026 Trivy attack (attackers force-pushed 76 of 77 version tags to credential-stealing malware). SHA pinning is required. Search terms used: "actions/checkout CVE security advisory 2025 2026".

**Recommendation:** Update to v6.0.2, pinned to its commit SHA. The label "current stable" for v3 is factually wrong as of this review date.

**Your call:** Decide whether Docker container actions are in scope. If yes, verify runner version >= v2.329.0 before deploying. If using non-GitHub runners, stay on v5 (SHA: to be fetched separately) until v6 compatibility is confirmed for your platform.

---

## Issue 2: actions/upload-artifact@v2 — described as "the latest stable release"

### actions/upload-artifact: v2 -> v7.0.0

**Risk level:** SECURITY / DEPRECATION — this version is actively broken on github.com
**Verified via:** GitHub API — `api.github.com/repos/actions/upload-artifact/releases/latest` and `/tags`
**What changed:**

- v2 was deprecated June 30, 2024. Workflows using it began **failing** on January 30, 2025.
- v4: Major backend architecture rewrite. Upload/download speeds improved up to 98%. Key behavior changes: artifacts are immutable once uploaded; artifact names must be unique per run (duplicate names cause a 409 Conflict error); hidden files excluded by default from v4.4+; 500-artifact limit per job; special characters forbidden in artifact names; v2 uploads are incompatible with v4 downloads (both must be upgraded together).
- v5: Node.js 24 preliminary support.
- v6: Node.js 24 default runtime; requires minimum Actions Runner v2.327.1.
- v7.0.0 (latest, 2026-02-26): Support for uploading single files directly (unzipped); upgraded to ESM module format.

**Breaking changes:** Yes — multiple. Immutable artifacts, unique name enforcement, hidden files exclusion, incompatibility between v2 uploads and v4+ downloads, ESM module format in v7. Any existing workflow using duplicate artifact names or relying on hidden files in artifacts will require code changes.

**Migration steps:**

1. Replace `actions/upload-artifact@v2` with `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (SHA for v7.0.0).
2. Simultaneously upgrade any paired `actions/download-artifact` to v4 or later (v2 and v4+ are incompatible).
3. Audit artifact names in all jobs — remove duplicates or add `overwrite: true`.
4. If hidden files (e.g., `.env`, credential files) were previously uploaded, add `include-hidden-files: true` explicitly and review whether those uploads should exist at all.
5. Sanitize artifact names: remove `" : < > | * ? \ r \ n \ /`.
6. If using self-hosted runners, ensure runner version >= v2.327.1 before deploying v6 or v7.

**Security advisories:** No CVE specific to `actions/upload-artifact` itself found. The description "latest stable release" for v2 is factually incorrect — v2 is deprecated and broken. Search terms used: "actions/upload-artifact CVE security advisory 2025 2026".

**Recommendation:** This is the highest-priority fix in the plan. The plan's description of v2 as "the latest stable release" is wrong by approximately five major versions and by over a year of deprecation. Any workflow currently using this pin has been failing since January 30, 2025.

**Your call:** Upgrade to v7.0.0 (pinned SHA above). If the jump to v7 is too large to absorb in one sprint, v4 is the minimum viable version for a working workflow on github.com, but v7 is current.

---

## Issue 3: SHA pinning absent for both actions

**Risk level:** SECURITY
**Verified via:** GitHub API — `api.github.com/repos/actions/checkout/git/refs/tags/v3` and `/git/refs/tags/v7.0.0` etc.

The plan references both actions by mutable version tags (`@v3`, `@v2`). Mutable tags can be force-pushed by anyone with write access to the upstream repository, including a compromised maintainer account or a supply-chain attacker. This was demonstrated concretely in March 2026 when 76 of 77 version tags in `aquasecurity/trivy-action` were force-pushed to credential-stealing malware.

**Current SHAs (verified 2026-03-23):**

| Tag                                                | SHA                                        |
|----------------------------------------------------|--------------------------------------------|
| actions/checkout v3 (plan's pinned version)        | `f43a0e5ff2bd294095638e18286ca9a3d1956744` |
| actions/checkout v6.0.2 (recommended)              | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` |
| actions/upload-artifact v2 (plan's pinned version) | `82c141cc518b40d92cc801eee768e7aafc9c2fa2` |
| actions/upload-artifact v7.0.0 (recommended)       | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` |

All action references in the plan must be updated to use the full 40-character commit SHA as the pin, with the tag kept as a comment for human readability. Example:

```yaml
# Before (mutable, insecure)
- uses: actions/checkout@v3

# After (SHA-pinned, secure)
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
```

---

## Issue 4: cosign version — internal contradiction and stale minimum requirement

### cosign: ">=1.x" (runner inventory) vs "v3.0.5" (verified versions table)

**Risk level:** SECURITY (cosign v1.x contains unfixed CVEs and is deprecated)
**Verified via:** GitHub API — `api.github.com/repos/sigstore/cosign/releases/latest` and `/tags`; WebSearch for "cosign sigstore CVE security advisory 2025 2026"

**The contradiction:** The plan has two sections making incompatible claims:

- Runner inventory: `cosign >= 1.x`
- Verified versions table: `cosign v3.0.5`

These are inconsistent. `>= 1.x` permits cosign 1.x and 2.x as compliant, but v3.0.5 is the currently specified version. The plan cannot be both simultaneously correct.

**Current state of cosign (verified 2026-03-23):**

- Latest release: v3.0.5, published 2026-02-19
- Latest tags: v3.0.5, v3.0.4, v3.0.3, v3.0.2, v3.0.1, v3.0.0 (v3.x series is current)
- Cosign v1.x: Deprecated. No longer actively maintained. Users have been urged to migrate to v2 and then v3.
- Cosign v2.x: Stable but transitioning. Final v2 release planned; critical security/bug fixes only. Users recommended to move to v3.

**CVE-2026-24122 (GHSA-wfqv-66vq-46rm):**

- Affects cosign versions **3.0.4 and below**
- Published: 2026-02-19 (same day as v3.0.5 release)
- CVSS 3.1: 3.7 (LOW) — `AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N`
- Summary: Cosign considers signatures valid when issued with an expired intermediate certificate, when transparency log verification is skipped. Root cause: Cosign verifies the chain using the leaf certificate's "not before" timestamp, then checks leaf expiry via Rekor/timestamp authority or current time, but assumes all issuing/root certificates are valid during the leaf's validity period.
- Impact: No impact on users of the public Sigstore infrastructure. May affect private deployments with customized PKIs.
- Fix: Upgrade to v3.0.5.

**What this means for the plan:**

- Any runner configured with cosign 1.x or 2.x satisfies `>= 1.x` but violates the `v3.0.5` requirement and is exposed to CVE-2026-24122 (if on v3.0.4 or below) plus all vulnerabilities fixed in v2.x and v3.x.
- The minimum requirement must be updated to `cosign >= 3.0.5` (or exactly `cosign v3.0.5`) to eliminate the contradiction and ensure CVE-2026-24122 is remediated.

**cosign v3.0.5 SHA (verified):** `d8094afa290043675fb2eff77b763f021d04a2e8`

**Migration steps:**

1. Update runner inventory to state `cosign >= 3.0.5` (not `>= 1.x`).
2. Ensure all runners are upgraded to exactly v3.0.5 or later before deployment.
3. If using `cosign-installer` GitHub Action: note that `cosign-installer` v3.x cannot install cosign v3.x — you must use `cosign-installer` v4.

**Recommendation:** Fix the internal contradiction immediately. The `>= 1.x` floor is dangerously loose and contradicts the verified versions table. Tighten it to `>= 3.0.5` to match the verified version and remediate CVE-2026-24122.

**Your call:** Set the minimum to `cosign >= 3.0.5` in the runner inventory to align with the verified versions table and close the CVE exposure. Decide whether to track v3.x minor releases as they ship or lock to exactly v3.0.5.

---

## Prioritized Issue List

### SECURITY (act now)

1. **actions/upload-artifact@v2** — deprecated and broken since 2025-01-30; described incorrectly as "latest stable release." Upgrade to v7.0.0, SHA `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`.
2. **cosign runner inventory `>= 1.x`** — contradicts the verified versions table, permits versions vulnerable to CVE-2026-24122. Update minimum to `>= 3.0.5`.
3. **SHA pinning absent** — both actions use mutable tags, exploitable via supply-chain tag poisoning (demonstrated in the wild March 2026). Pin all actions to full commit SHAs.

### DEPRECATION (plan soon)

1. **actions/checkout@v3** — described incorrectly as "current stable." v3 is three major versions behind; v6.0.2 is current. Update to SHA `de0fac2e4500dabe0009e67214ff5f5447ce83dd`.

---

## Verification Log

| Claim                                           | Tool      | Source                                                                  | Finding                                                                                                                   |
|-------------------------------------------------|-----------|-------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| actions/checkout latest release                 | WebFetch  | `api.github.com/repos/actions/checkout/releases/latest`                 | v6.0.2, published 2026-01-09                                                                                              |
| actions/checkout all tags                       | WebFetch  | `api.github.com/repos/actions/checkout/tags`                            | Latest: v6.0.2, v6.0.1, v6.0.0; v3.x series starts at v3.6.0                                                              |
| actions/checkout v3 SHA                         | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v3`                | `f43a0e5ff2bd294095638e18286ca9a3d1956744`                                                                                |
| actions/checkout v6.0.2 SHA                     | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`            | `de0fac2e4500dabe0009e67214ff5f5447ce83dd`                                                                                |
| actions/upload-artifact latest release          | WebFetch  | `api.github.com/repos/actions/upload-artifact/releases/latest`          | v7.0.0, published 2026-02-26                                                                                              |
| actions/upload-artifact all tags                | WebFetch  | `api.github.com/repos/actions/upload-artifact/tags`                     | Latest: v7.0.0; v2.x series ends at v3.2.2 predecessor                                                                    |
| actions/upload-artifact v2 SHA                  | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v2`         | `82c141cc518b40d92cc801eee768e7aafc9c2fa2`                                                                                |
| actions/upload-artifact v7.0.0 SHA              | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`     | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`                                                                                |
| cosign latest release                           | WebFetch  | `api.github.com/repos/sigstore/cosign/releases/latest`                  | v3.0.5, published 2026-02-19                                                                                              |
| cosign all tags                                 | WebFetch  | `api.github.com/repos/sigstore/cosign/tags`                             | Latest: v3.0.5; v3.x series from v3.0.0; v2.x and v1.x also present                                                       |
| cosign v3.0.5 SHA                               | WebFetch  | `api.github.com/repos/sigstore/cosign/git/refs/tags/v3.0.5`             | `d8094afa290043675fb2eff77b763f021d04a2e8`                                                                                |
| actions/checkout security advisories            | WebSearch | "actions/checkout CVE security advisory 2025 2026"                      | No CVE specific to checkout itself; mutable tag supply-chain attack demonstrated March 2026 (Trivy incident)              |
| actions/upload-artifact security advisories     | WebSearch | "actions/upload-artifact CVE security advisory 2025 2026"               | No CVE specific to upload-artifact itself; artifact exfiltration used in CVE-2025-30066 attack chain                      |
| cosign security advisories                      | WebSearch | "cosign sigstore CVE security advisory 2025 2026"                       | CVE-2026-24122 (GHSA-wfqv-66vq-46rm): affects v3.0.4 and below; fixed in v3.0.5                                           |
| cosign v1.x deprecation status                  | WebSearch | "cosign v1.x end of life deprecated 2025"                               | v1.x deprecated; v2.x in maintenance mode; v3.x is current recommended; v4 planned                                        |
| actions/checkout v3->v6 breaking changes        | WebSearch | "actions/checkout v3 vs v6 breaking changes migration 2025 2026"        | Main breaking change: credential storage moved to `$RUNNER_TEMP`; affects Docker container actions and non-GitHub runners |
| actions/upload-artifact v2->v7 breaking changes | WebSearch | "actions/upload-artifact v2 vs v7 breaking changes migration 2025 2026" | v2 deprecated June 2024, broken January 2025; v4+ has immutable artifacts, unique name enforcement, hidden file exclusion |

### Self-check results

- Every version sourced from a live lookup: YES
- Both releases AND tags checked for all three dependencies: YES
- Security search count matches dependency count (3 deps, 3 security searches): YES
- Changelogs/migration notes read for every upgrade: YES (via WebSearch for each)
- SHA fetched for every GitHub Action reference: YES (v3, v6.0.2, v2, v7.0.0 all fetched)
