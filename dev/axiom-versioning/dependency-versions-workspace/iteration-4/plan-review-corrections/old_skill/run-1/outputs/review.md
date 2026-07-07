# Deployment Plan Review: Dependency Version Findings

This is a review task (auditing an existing plan), so findings are presented
directly by risk level without a shipping-timeline question.

## Step 1: Inventory

External dependencies referenced in the plan:

| Dependency | Plan-stated version | Plan's claim about currency |
|---|---|---|
| `actions/checkout` | `v3` | "current stable" |
| `actions/upload-artifact` | `v2` | "the latest stable release" |
| `cosign` (runner inventory section) | `>= 1.x` | (stated as the accepted floor) |
| `cosign` (verified versions table) | `v3.0.5` | listed as the verified/pinned version |

The plan makes two different statements about the required/verified `cosign`
version in two different sections. That disagreement is a correctness issue on
its own, independent of whether either number is externally current — see the
CORRECTION finding below.

## Step 2 & 3: Verification Summary

- **actions/checkout** — `/releases/latest` and `/tags` agree: latest is
  **v7.0.0**. Plan pins `v3`, four majors behind.
- **actions/upload-artifact** — `/releases/latest` and `/tags` agree: latest is
  **v7.0.1**. Plan pins `v2`, five majors behind.
- **cosign** — `/releases/latest` and `/tags` agree: latest is **v3.1.1**. Plan's
  verified table pins `v3.0.5`, which is affected by a fixed security advisory
  (see below).

No `/releases` vs `/tags` divergence found for any of the three dependencies.

---

## Findings by Risk Level

### SECURITY

#### cosign: v3.0.5 -> v3.1.1

**Risk level:** SECURITY
**Verified via:** WebFetch `api.github.com/repos/sigstore/cosign/releases/latest` and
`/tags` (both show v3.1.1 as latest); WebSearch "cosign CVE security advisory 2025 2026";
GitHub Security Advisories page `github.com/sigstore/cosign/security/advisories`.
**What changed:** `cosign verify-blob-attestation` could erroneously report
"Verified OK" for attestations with malformed payloads or mismatched predicate
types. For old-format bundles/detached signatures this was a logic flaw in
predicate-type error handling; for new-format bundles, predicate-type
validation was bypassed entirely. Fixed in v3.0.6 (and backported to v2.6.3).
The plan's pinned v3.0.5 predates the fix. v3.1.1 is the current latest and
also deprecates several legacy trust-root/bundle flags (not yet removed) and
switches signing/logging to Rekor v2 with DSSE PAE hashing — no hard breaking
change identified between v3.0.5 and v3.1.1 beyond that deprecation.
**Breaking changes:** No breaking removal between v3.0.5 and v3.1.1. (Note:
the v2->v3 line already requires `--bundle` on `sign-blob`/`verify-blob` and
requires `cosign-installer` v4+ if installed via that Action — relevant only if
upgrading from a v2.x pin, not from v3.0.5.)
**Security advisories:** CVE-2026-39395 / GHSA-w6c6-c85g-mmv6 — "verify-blob-attestation
reports false positive when payload parsing fails." CVSS 3.1 base score 4.3
(MEDIUM). Affected versions: all versions before 2.6.3, and all versions from
3.0.0 before 3.0.6. **The plan's pinned v3.0.5 falls inside the affected
range.** Workaround if upgrade is delayed: always pass `--check-claims=true`
during attestation verification.
**Recommendation:** Upgrade the verified/pinned cosign version to v3.1.1. This
is a signature/attestation verification tool — a bypassable predicate-type
check undermines the supply-chain guarantee the plan is presumably using
cosign for in the first place.
**Your call:** Upgrade now, or at minimum move to v3.0.6 (the direct fix) if
v3.1.1's flag deprecations need more validation time.

### DEPRECATION

#### actions/upload-artifact: v2 -> v7.0.1

**Risk level:** DEPRECATION
**Verified via:** WebFetch `api.github.com/repos/actions/upload-artifact/releases/latest`
and `/tags` (both show v7.0.1 as latest, published 2026-04-10).
**What changed:** v2 was deprecated June 30, 2024, and uploads using v2 (and v3)
began hard-failing (erroring, not just warning) as of Jan 30, 2025 when GitHub
shut down the legacy Artifacts backend those versions depended on. v4+ rebuilt
artifact upload/download on a new immutable-artifact backend; v7 is the current
major line.
**Breaking changes:** Yes, relative to v2 — v4+ changed upload semantics
(duplicate artifact names now fail with a 409 Conflict instead of merging), and
artifacts became immutable after upload. Multiple sequential uploads to the
same artifact name in one workflow need restructuring (e.g., unique names per
job/matrix leg).
**Migration steps:** Update workflow YAML from `actions/upload-artifact@v2` to
the pinned v7.0.1 commit SHA (see below); audit any steps that upload to the
same artifact name more than once and give them unique names.
**Security advisories:** None found via WebSearch "actions/upload-artifact CVE
security advisory 2025 2026" specific to this action. (Search surfaced adjacent
incidents — tj-actions/changed-files CVE-2025-30066 and a distinct Gitea
Actions Artifacts CVE — neither applies to `actions/upload-artifact` itself.)
**Recommendation:** Immediate upgrade — this is not merely stale, workflows
pinned to v2 have been functionally broken (uploads erroring) since January
2025.
**Your call:** Upgrade now; treat as a functional-breakage fix, not routine
maintenance.

#### actions/checkout: v3 -> v7.0.0

**Risk level:** DEPRECATION
**Verified via:** WebFetch `api.github.com/repos/actions/checkout/releases/latest`
and `/tags` (both show v7.0.0 as latest); WebSearch on the Node16/Node20 runtime
deprecation timeline for GitHub Actions.
**What changed:** `checkout@v3` runs on the Node16 JavaScript Actions runtime.
GitHub enforced the Node16 -> Node20 migration starting June 3, 2024, and Node16
was subsequently removed from hosted runners — actions still declaring node16
are force-run on a newer runtime rather than their tested one. `v4` moved to
Node20, `v5`/`v6` moved to Node24, and `v7` additionally blocks checking out
fork pull-request content for `pull_request_target` and `workflow_run` events
(a security hardening change) and migrated the action to ESM, dropping the UUID
dependency.
**Breaking changes:** Yes, for `pull_request_target`/`workflow_run` workflows
that currently rely on checking out fork PR content by ref — v7 blocks that by
default. Otherwise the v3->v7 jump is runtime modernization with no input/output
API changes identified.
**Migration steps:** Update workflow YAML from `actions/checkout@v3` to the
pinned v7.0.0 commit SHA (see below); if any workflow checks out fork PR heads
under `pull_request_target`/`workflow_run`, re-validate that behavior explicitly
against v7's new default before rolling out broadly.
**Security advisories:** None found directly against `actions/checkout` via
WebSearch "actions/checkout GitHub Action CVE security advisory 2025 2026" — the
action itself has no CVE. (Search surfaced a related but distinct issue: a
critical Microsoft advisory, CVE-2025-61671, involving a *caller* workflow that
checked out a PR's automatic merge ref via `checkout@v5`; that is a workflow
design risk, not a defect in the `actions/checkout` action.)
**Recommendation:** Upgrade to v7.0.0. Running on a removed Node runtime is a
latent compatibility risk even though the platform currently force-upgrades the
runtime transparently.
**Your call:** Upgrade now; if any `pull_request_target`/`workflow_run` jobs
depend on fork-PR checkout, validate those specifically before merging the bump.

### CORRECTION

#### "actions/checkout@v3 described as 'current stable'": CORRECTION

**Risk level:** CORRECTION
**What is stated:** The plan reads: `actions/checkout@v3 (current stable)`.
**What is correct:** v3 is four major versions behind. The current latest is
v7.0.0 (verified via GitHub API `/releases/latest` and `/tags`, both agreeing).
v3 also runs on the Node16 runtime, which GitHub has already removed from
hosted runners.
**Why it matters:** A reader relying on the "current stable" label would
conclude no action is needed, when in fact the pinned version is running on a
retired runtime and missing a security-relevant default change (v7's fork-PR
checkout restriction). The label actively misleads anyone auditing the plan
for currency.
**Fix:** Change `(current stable)` to `(four majors behind current; upgrade to
v7.0.0 — see DEPRECATION finding above)`.

#### "actions/upload-artifact@v2 described as 'the latest stable release'": CORRECTION

**Risk level:** CORRECTION
**What is stated:** The plan reads: `actions/upload-artifact@v2 (the latest
stable release)`.
**What is correct:** v2 was deprecated June 30, 2024, and has been non-functional
(uploads erroring) since January 30, 2025. The current latest is v7.0.1
(verified via GitHub API `/releases/latest` and `/tags`, both agreeing).
**Why it matters:** This is not a stale-but-working case — the label asserts
the pinned version is both current and functional when it is neither. Anyone
executing this plan as written would hit hard upload failures in CI, and the
label gives no indication why.
**Fix:** Change `(the latest stable release)` to `(deprecated since June 2024;
non-functional since Jan 2025 — upgrade to v7.0.1; see DEPRECATION finding
above)`.

#### cosign version requirement is internally inconsistent: CORRECTION

**Risk level:** CORRECTION
**What is stated:** The runner inventory section states the requirement as
`cosign >= 1.x`. The verified versions table separately states `cosign v3.0.5`.
These are two different sections of the same plan making two different claims
about the same dependency's required/verified version.
**What is correct:** Per the skill's self-check rule, an internal disagreement
between sections referencing the same dependency is a CORRECTION-level finding
regardless of which stated value is closer to accurate. Substantively here,
neither value is safe to publish as-is: `>= 1.x` as a floor would permit
installing a cosign v1.x release, which predates the v2 identity-flag
requirements (`--certificate-identity`, `--certificate-oidc-issuer`) and the v3
bundle format, and lacks the fix for CVE-2026-39395 entirely. The verified
table's `v3.0.5` is closer to current but is itself affected by that same CVE
(see SECURITY finding above).
**Why it matters:** Whichever number an implementer or auditor reads first
becomes "the" requirement in their head. If the `>= 1.x` floor from the runner
inventory is what actually gets enforced (e.g., in a version-check script or
runbook), the plan would silently permit a two-major-version-old, pre-identity-flag,
pre-CVE-fix cosign install while the plan's own verified-versions table claims
v3.0.5 is what's in use. That gap is exactly the kind of drift that lets a
stale, insecure tool version ship under a document that "looks" verified.
**Fix:** Reconcile both sections to a single stated requirement. Recommended:
set the runner inventory floor to `cosign >= 3.1.1` (matching the SECURITY
finding's recommended upgrade) and update the verified versions table to
`v3.1.1`, so both sections agree and reflect the CVE-2026-39395 fix.

---

## SHA Pinning (Invariant 4)

Per the skill's mandatory SHA-pinning rule for GitHub Actions, the recommended
pins for the two Actions covered above are:

```text
actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
```

Both resolved directly to commit objects via
`api.github.com/repos/{owner}/{repo}/git/refs/tags/{tag}` (`"object": {"type":
"commit"}`) — neither is an annotated tag, so no second lookup was needed.

`cosign` was described in the plan text as a runner-inventory/version-table
entry, not as a specific GitHub Action reference (e.g., `sigstore/cosign-installer@...`).
No SHA pin is issued here because the installation mechanism wasn't specified
in the material reviewed. `[UNVERIFIED]`: if cosign is installed via
`sigstore/cosign-installer` in the actual workflow YAML, that Action reference
must also be SHA-pinned and independently version-checked — it was out of scope
for this review since it wasn't part of the provided plan text.

---

## Step 6: Verification Log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| actions/checkout latest version | WebFetch | `api.github.com/repos/actions/checkout/releases/latest` | v7.0.0, published 2026-06-18 |
| actions/checkout tags match releases | WebFetch | `api.github.com/repos/actions/checkout/tags` | v7.0.0 is highest tag; no divergence from releases/latest |
| actions/checkout v7.0.0 commit SHA | WebFetch | `api.github.com/repos/actions/checkout/git/refs/tags/v7.0.0` | commit `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` (direct commit object, not annotated) |
| actions/checkout security advisories | WebSearch | "actions/checkout GitHub Action CVE security advisory 2025 2026" | No CVE against the action itself; adjacent incident CVE-2025-61671 concerns caller-workflow misuse of merge refs, not an action defect |
| actions/checkout v3->v7 changes | WebSearch + WebFetch | Node16/Node20 deprecation changelog; `github.com/actions/checkout/releases` | v3 runs on removed Node16 runtime; v7 blocks fork-PR checkout for `pull_request_target`/`workflow_run` |
| actions/upload-artifact latest version | WebFetch | `api.github.com/repos/actions/upload-artifact/releases/latest` | v7.0.1, published 2026-04-10 |
| actions/upload-artifact tags match releases | WebFetch | `api.github.com/repos/actions/upload-artifact/tags` | v7.0.1 is highest tag; no divergence from releases/latest |
| actions/upload-artifact v7.0.1 commit SHA | WebFetch | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.1` | commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (direct commit object, not annotated) |
| actions/upload-artifact security advisories | WebSearch | "actions/upload-artifact CVE security advisory 2025 2026" | No CVE found for this action specifically |
| actions/upload-artifact v2 deprecation/failure dates | WebSearch | general search results referencing GitHub's Jan 2025 legacy Artifacts backend shutdown | v2 deprecated June 30, 2024; uploads erroring since Jan 30, 2025 |
| cosign latest version | WebFetch | `api.github.com/repos/sigstore/cosign/releases/latest` | v3.1.1, published 2026-06-09 |
| cosign tags match releases | WebFetch | `api.github.com/repos/sigstore/cosign/tags` | v3.1.1 is highest tag; no divergence from releases/latest |
| cosign v3.0.5 security status | WebSearch + WebFetch | `github.com/sigstore/cosign/security/advisories`; GHSA-w6c6-c85g-mmv6 / CVE-2026-39395 | v3.0.5 is inside the affected range (>=3.0.0, <3.0.6); fixed in 3.0.6 |
| cosign v3.0.5 -> v3.1.1 changelog | WebSearch | "cosign changelog v3.0.5 to v3.1.1 breaking changes" | No hard breaking change; deprecates legacy trust-root/bundle flags, moves to Rekor v2/DSSE PAE |
| cosign v1.x status | WebSearch | "cosign v1 end of life deprecated unsupported" | No single formal EOL notice, but v1 predates v2's mandatory identity-flag verification requirements and v3's bundle format; project documentation consistently directs users off v1 |

### Self-check

- Every version sourced from a live lookup? Yes — checkout, upload-artifact,
  and cosign versions all came from GitHub API `/releases/latest` and `/tags`.
- Both releases AND tags checked? Yes, for all three dependencies; no
  divergence found in any case.
- Every dependency covered by at least one security search? Yes — separate
  WebSearch queries were run for `actions/checkout`, `actions/upload-artifact`,
  and `cosign`.
- Changelogs read for every upgrade (not just version existence confirmed)?
  Yes — checkout's Node16/20/24 progression and v7 fork-PR change; upload-artifact's
  deprecation/failure timeline and v4+ immutability/409 behavior; cosign's
  v3.0.5->v3.1.1 changelog and the specific CVE fix in v3.0.6.
- SHA fetched for every GitHub Action reference? Yes for checkout and
  upload-artifact. Cosign was not referenced as a specific GitHub Action in the
  plan text provided, so no Action SHA applies to it here — flagged as
  `[UNVERIFIED]` scope gap above if cosign-installer is used in the real workflow.
- Internal consistency checked? Yes — the cosign `>= 1.x` (runner inventory) vs
  `v3.0.5` (verified table) disagreement is called out as its own CORRECTION,
  separate from the SECURITY finding on the v3.0.5 pin itself.
- False contemporaneity claims checked? Yes — both `actions/checkout@v3
  (current stable)` and `actions/upload-artifact@v2 (the latest stable
  release)` are false claims about stale versions, and each has its own
  dedicated CORRECTION entry, not folded into the version-delta findings.
