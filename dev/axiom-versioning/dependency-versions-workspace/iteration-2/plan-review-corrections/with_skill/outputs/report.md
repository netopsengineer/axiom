# Deployment Plan Review — Currency and Accuracy Report

**Review date:** 2026-03-23
**Scope:** GitHub Actions version pins and cosign version references

---

## Summary of Findings

| # | Item                                                                                | Type                           | Risk Level             |
|---|-------------------------------------------------------------------------------------|--------------------------------|------------------------|
| 1 | `actions/upload-artifact@v2` labelled "the latest stable release"                   | Version outdated + label false | SECURITY / DEPRECATION |
| 2 | `actions/checkout@v3` labelled "current stable"                                     | Version outdated + label false | DEPRECATION            |
| 3 | Runner inventory says `cosign >= 1.x`; verified versions table says `cosign v3.0.5` | Internal inconsistency         | CORRECTION             |
| 4 | Both action pins use mutable tags — no SHA pins present                             | Supply-chain risk              | SECURITY               |

---

## Findings (ordered by risk level)

---

### actions/upload-artifact@v2: SECURITY + DEPRECATION

**Risk level:** SECURITY / DEPRECATION
**Verified via:** WebFetch — `api.github.com/repos/actions/upload-artifact/releases/latest` and `/tags`; GitHub changelog

**What is stated in the plan:** `actions/upload-artifact@v2` described as "the latest stable release."

**What is actually current:** Latest release is `v7.0.0` (published 2026-02-26). The plan is five major versions behind.

**Deprecation status:** v1 and v2 were officially deprecated on **June 30, 2024**. Since **January 30, 2025**, any workflow using `upload-artifact@v2` **fails at runtime**. The plan documents a version that causes immediate CI breakage.

**What changed (v2 -> v7):**

- v4: New artifact backend; artifacts are now immutable (uploading a duplicate name returns a 409 Conflict error — a silent-overwrite workflow breaks); hidden files excluded by default from v4.4+; `upload-artifact/merge` sub-action added.
- v5: Node.js 24 preliminary support.
- v6: Full Node.js 24 runtime (`node24`); requires Actions Runner >= 2.327.1 on self-hosted runners.
- v7: "Direct Uploads" for single files without zipping; ESM upgrade.

**Breaking changes:** Yes — artifact immutability (v4+) is a behavioral breaking change; any workflow that uploads multiple artifacts with the same name must be updated.

**Migration steps:**

1. Update pin from `@v2` to `@v7.0.0` (pinned SHA: `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`).
2. Audit workflows for duplicate artifact names — replace with unique names or use `upload-artifact/merge`.
3. Audit for hidden-file uploads — add `include-hidden-files: true` where needed.
4. Verify self-hosted runners are at Actions Runner >= 2.327.1 before deploying v6+.

**Security advisories:** The search for `actions/checkout actions/upload-artifact GitHub Actions security advisory CVE 2025 2026` surfaced general artifact-poisoning risk (privilege escalation via `workflow_run` consuming artifacts from untrusted PRs) as a systemic concern for `upload-artifact` usage patterns, but no CVE directly assigned to the `upload-artifact` action binary itself. No CVE ID found specific to `upload-artifact`. No advisories found via search terms: "actions/checkout actions/upload-artifact GitHub Actions security advisory CVE 2025 2026".

**Recommendation:** Upgrade immediately. The action is already broken in CI (post-January 2025 deprecation). Update to `@v7.0.0` pinned by SHA and review artifact immutability impact.

**Your call:** Confirm the new pin `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0` and decide whether any workflows rely on same-name artifact overwrites (which must be refactored).

---

### actions/checkout@v3: DEPRECATION

**Risk level:** DEPRECATION
**Verified via:** WebFetch — `api.github.com/repos/actions/checkout/releases/latest` and `/tags`; GitHub changelog; web search for migration notes.

**What is stated in the plan:** `actions/checkout@v3` described as "current stable."

**What is actually current:** Latest release is `v6.0.2` (published 2026-01-09). The plan is three major versions behind.

**Deprecation status:** `actions/checkout@v3` was deprecated and **started failing on January 30, 2025**. "Current stable" is factually false — this version causes CI failure.

**What changed (v3 -> v6.0.2):**

- v4: Default runtime updated to Node.js 20.
- v5: Credential storage via `.git/config` path-based `includeIf` directives.
- v6: Credentials persisted to `$RUNNER_TEMP` instead of directly in `.git/config`. No workflow YAML changes required for standard use. Known issue: Docker container actions require Actions Runner >= v2.329.0; on Forgejo/Gitea runners the `includeIf` path is hardcoded to GitHub paths and breaks auth.

**Breaking changes:** For most workflows — none (version bump only). For workflows using Docker container actions — requires runner >= v2.329.0 or stay on v5. For non-GitHub CI platforms — stay on v5.

**Migration steps:**

1. Standard workflows: Update pin to `actions/checkout@v6.0.2` (pinned SHA: `de0fac2e4500dabe0009e67214ff5f5447ce83dd`).
2. Docker container action workflows: Confirm runner version >= v2.329.0, or pin to v5 pending fix for Issue #2359.
3. Non-GitHub runners (Forgejo, Gitea): Pin to v5 until `includeIf` path issue is resolved.

**Security advisories:** CVE-2025-61671 was assigned to a Microsoft/symphony repository that misused `actions/checkout@v5` (checking out PR content via merge ref in a privileged context, CVSS 9.3). This is a workflow misconfiguration pattern, not a vulnerability in the `checkout` action itself. No CVE directly assigned to the `checkout` action binary found via search terms: "actions/checkout actions/upload-artifact GitHub Actions security advisory CVE 2025 2026".

**Recommendation:** Upgrade to v6.0.2 with SHA pin. For Docker container action workflows, audit runner version before upgrading past v5.

**Your call:** Confirm the new pin `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2` and identify whether any jobs use Docker container actions (step `uses: docker://...` or `container:` key).

---

### SHA pinning absent for both actions: SECURITY

**Risk level:** SECURITY
**Verified via:** `api.github.com/repos/actions/checkout/git/refs/tags/v3`, `.../git/refs/tags/v6.0.2`, `api.github.com/repos/actions/upload-artifact/git/refs/tags/v2`, `.../git/refs/tags/v7.0.0`

**What is stated in the plan:** Both actions are referenced by mutable version tags (`@v3`, `@v2`) without SHA pins.

**Why it matters:** Mutable tags are a supply-chain attack vector. The 2025 `tj-actions/changed-files` incident (CVE-2025-30066, CVSS 8.6) demonstrated that compromising a widely-used action's mutable tag causes downstream secrets to leak across all consuming workflows. CISA issued a remediation advisory recommending SHA pinning for all GitHub Actions.

**Current SHAs (live-verified):**

| Action                    | Tag      | SHA                                        | Tag object type |
|---------------------------|----------|--------------------------------------------|-----------------|
| `actions/checkout`        | `v3`     | `f43a0e5ff2bd294095638e18286ca9a3d1956744` | commit (direct) |
| `actions/checkout`        | `v6.0.2` | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` | commit (direct) |
| `actions/upload-artifact` | `v2`     | `82c141cc518b40d92cc801eee768e7aafc9c2fa2` | commit (direct) |
| `actions/upload-artifact` | `v7.0.0` | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` | commit (direct) |

**Fix:** Use SHA-pinned references with a comment showing the version tag:

```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
- uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0
```

**Your call:** Adopt SHA pinning policy for all third-party actions in the plan, and add Dependabot configuration to automate SHA-pinned updates going forward.

---

### Runner inventory vs. verified versions table — cosign version: CORRECTION

**Risk level:** CORRECTION
**Verified via:** `api.github.com/repos/sigstore/cosign/releases/latest` and `/tags`; WebSearch for cosign CVE and deprecation history.

**What is stated:** Two sections in the plan contradict each other:

- Runner inventory section: `cosign >= 1.x`
- Verified versions table: `cosign v3.0.5`

**What is correct:** The sections disagree. `cosign v3.0.5` in the verified versions table is the current latest stable release (published 2026-02-19, confirmed via live API). `cosign >= 1.x` in the runner inventory is wrong on two levels:

1. **Factual error:** cosign v1.x is effectively end-of-life. The GCS release bucket was shut down on 2023-10-31. The project moved to a `sigstore-go`-based v2/v3 line with breaking CLI changes. Specifying `>= 1.x` admits any version including obsolete ones that lack current security fixes.

2. **Internal inconsistency:** The two sections cite incompatible versions of the same tool. A reader following the runner inventory would consider cosign 1.13.1 acceptable; the versions table implies only 3.0.5 is verified.

**Security advisories:** CVE-2026-24122 (published 2026-02-19, CVSS 3.7 LOW) — improper certificate validation (CWE-295) in cosign versions <= 3.0.4 when verifying signatures with a customized PKI where an intermediate certificate expires before the leaf. Fixed in **v3.0.5**. No impact on users of public Sigstore infrastructure. Private PKI deployments must upgrade to 3.0.5.

**Why it matters:** The inconsistency means runners could be provisioned with cosign 1.x (matching the inventory requirement) while the plan claims 3.0.5 is verified. A runner with cosign 1.x or any 3.0.x < 3.0.5 would be missing the CVE-2026-24122 fix in private PKI setups. Future maintainers cannot tell which section is authoritative.

**Fix:** Align both sections to a single pinned minimum:

- Runner inventory: change `cosign >= 1.x` to `cosign >= 3.0.5`
- Verified versions table: keep `cosign v3.0.5` (already correct)
- Add a note: "cosign 1.x is end-of-life; the GCS distribution bucket was retired 2023-10-31. Minimum supported version is 3.0.5 (fixes CVE-2026-24122)."

---

## Verification Log

| Claim                                                        | Tool      | Source                                                                                           | Finding                                                                                                                                                                                                        |
|--------------------------------------------------------------|-----------|--------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `actions/checkout` latest release                            | WebFetch  | `api.github.com/repos/actions/checkout/releases/latest`                                          | v6.0.2, published 2026-01-09                                                                                                                                                                                   |
| `actions/checkout` tags                                      | WebFetch  | `api.github.com/repos/actions/checkout/tags`                                                     | Latest tag: v6.0.2; v3 series present but deprecated                                                                                                                                                           |
| `actions/upload-artifact` latest release                     | WebFetch  | `api.github.com/repos/actions/upload-artifact/releases/latest`                                   | v7.0.0, published 2026-02-26                                                                                                                                                                                   |
| `actions/upload-artifact` tags                               | WebFetch  | `api.github.com/repos/actions/upload-artifact/tags`                                              | Latest tag: v7.0.0                                                                                                                                                                                             |
| SHA for `actions/checkout@v3`                                | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v3`                                         | `f43a0e5ff2bd294095638e18286ca9a3d1956744` (commit, direct)                                                                                                                                                    |
| SHA for `actions/checkout@v6.0.2`                            | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                                     | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (commit, direct)                                                                                                                                                    |
| SHA for `actions/upload-artifact@v2`                         | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v2`                                  | `82c141cc518b40d92cc801eee768e7aafc9c2fa2` (commit, direct)                                                                                                                                                    |
| SHA for `actions/upload-artifact@v7.0.0`                     | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`                              | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (commit, direct)                                                                                                                                                    |
| `cosign` latest release                                      | WebFetch  | `api.github.com/repos/sigstore/cosign/releases/latest`                                           | v3.0.5, published 2026-02-19                                                                                                                                                                                   |
| `cosign` tags                                                | WebFetch  | `api.github.com/repos/sigstore/cosign/tags`                                                      | Latest: v3.0.5; v2.x series also present; v1.x not shown in recent tags                                                                                                                                        |
| `actions/checkout` and `upload-artifact` security advisories | WebSearch | Query: "actions/checkout actions/upload-artifact GitHub Actions security advisory CVE 2025 2026" | No CVE assigned directly to either action binary. CVE-2025-30066 (`tj-actions/changed-files`) is context for SHA-pinning importance. CVE-2025-61671 is a checkout misuse pattern, not an action vulnerability. |
| `cosign` security advisories                                 | WebSearch | Query: "cosign sigstore security advisory CVE 2025 2026"                                         | CVE-2026-24122 (CVSS 3.7 LOW) — improper cert validation in cosign <= 3.0.4, fixed in v3.0.5                                                                                                                   |
| `actions/checkout` v3 deprecation                            | WebSearch | Query: "actions/checkout v3 to v6 breaking changes changelog migration 2025 2026"                | v3 deprecated; failing since January 30, 2025                                                                                                                                                                  |
| `actions/upload-artifact` v2 deprecation                     | WebSearch | Query: "actions/upload-artifact v2 to v7 breaking changes changelog migration deprecation"       | v1/v2 deprecated June 30, 2024; failing since January 30, 2025                                                                                                                                                 |
| `cosign` v1.x status                                         | WebSearch | Query: "cosign v1.x end of life deprecated sigstore 2023 2024"                                   | GCS bucket retired 2023-10-31; v1.x effectively EOL                                                                                                                                                            |
| `actions/checkout` v4 release notes                          | WebFetch  | `github.com/actions/checkout/releases/tag/v4.0.0`                                                | v4: default runtime updated to Node.js 20                                                                                                                                                                      |

**Self-check:**

- Every version sourced from a live lookup: Yes.
- Both `/releases/latest` AND `/tags` checked: Yes, for all three dependencies.
- Every dependency covered by at least one security search: Yes — `actions/checkout` and `actions/upload-artifact` covered by a single combined search (both are `actions/*` org repos); `cosign` covered by a dedicated search.
- Changelogs read for every upgrade: Yes — v3->v6 (checkout), v2->v7 (upload-artifact), cosign v1.x->v3.x history.
- SHA fetched for every GitHub Action reference: Yes — both the pinned-in-plan tags (v3, v2) and the recommended target tags (v6.0.2, v7.0.0).
- Annotated tag resolution needed: No — all four tags resolved directly to commit objects (type: commit), no second lookup required.
- Internal consistency checked: Yes — cosign inconsistency between runner inventory and versions table identified and flagged.
