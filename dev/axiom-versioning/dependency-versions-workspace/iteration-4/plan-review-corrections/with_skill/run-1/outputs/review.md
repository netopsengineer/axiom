# Deployment Plan Review: Dependency Version Findings

Review scope: three dependency claims in the deployment plan — `actions/checkout@v3`
("current stable"), `actions/upload-artifact@v2` ("the latest stable release"),
and `cosign` (runner inventory: `>= 1.x`; verified-versions table: `v3.0.5`).
All version facts below were checked against live sources on 2026-07-06 per the
`dependency-versions` skill; nothing is drawn from training data.

## Inventory

| Dependency | Plan's stated claim | Section |
|---|---|---|
| `actions/checkout` | `@v3`, labeled "current stable" | GitHub Actions pins |
| `actions/upload-artifact` | `@v2`, labeled "the latest stable release" | GitHub Actions pins |
| `cosign` | Runner inventory: `>= 1.x`; Verified versions table: `v3.0.5` | Runner inventory vs. verified versions table |

## Findings, by risk level

### SECURITY

#### cosign: v3.0.5 -> v3.0.6 (or latest v3.1.1)

**Risk level:** SECURITY
**Verified via:** `python3 scripts/osv_scan.py "go:github.com/sigstore/cosign/v3@v3.0.5"`
(OSV.dev batch scan), confirmed by fetching
`https://api.osv.dev/v1/vulns/GHSA-w6c6-c85g-mmv6`. Cross-checked current tags via
`gh api repos/sigstore/cosign/tags` (top: `v3.1.1`, commit
`7914231b348c4057891edeb321772aad3ed04fce`) and
`gh api repos/sigstore/cosign/releases/latest` (`v3.1.1`, published 2026-06-09).
**What changed:** GHSA-w6c6-c85g-mmv6 / CVE-2026-39395 (MODERATE, CVSS 3.1
AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N): `cosign verify-blob-attestation` can report a
false "Verified OK" for attestations with malformed or unparsable payloads, or
with mismatched predicate types, when `--check-claims=true` is not set. The OSV
affected range is explicit: `introduced 3.0.0, fixed 3.0.6` — the plan's pinned
`v3.0.5` sits squarely inside the affected window.
**Breaking changes:** No — this is a patch-level fix, not a behavior change for
correctly-configured usage.
**Migration steps:** Version bump only, to `v3.0.6` at minimum (fixes this CVE)
or to current latest `v3.1.1` (commit `7914231b348c4057891edeb321772aad3ed04fce`).
Workaround if you cannot upgrade immediately: always pass `--check-claims=true`
to `cosign verify-blob-attestation`.
**Security advisories:** GHSA-w6c6-c85g-mmv6 / CVE-2026-39395 — MODERATE. Also
confirmed via the same scan that CVE-2026-24122 (GHSA-wfqv-66vq-46rm, referenced
in this skill's own reference material as "fixed in v3.0.5") is indeed already
fixed at v3.0.5 per `https://api.osv.dev/v1/vulns/GO-2026-4529` (`fixed: "3.0.5"`
on the `github.com/sigstore/cosign/v3` module path) — no action needed for that
one. Three older advisories (GO-2023-2181, GO-2024-2718, GO-2024-2719) were
initially flagged by a naive query against the unversioned `github.com/sigstore/cosign`
import path, but on inspection all three only affect the abandoned v0/v1 Go
module line (fixed in the `/v2` path at 2.2.1/2.2.4/2.2.4 respectively) and do
not apply to the `/v3` module actually in use — false positives from a Go
major-version import-path mismatch, not real findings for this pin.
**Recommendation:** Upgrade to at least v3.0.6, ideally current latest v3.1.1.
Low-effort, no breaking changes, and closes a real advisory whose affected range
includes the exact pinned version.
**Your call:** Bump the pin now, or accept the residual risk if
`--check-claims=true` is already enforced everywhere `verify-blob-attestation` is
used.

### DEPRECATION

#### actions/checkout: v3 -> v7.0.0

**Risk level:** DEPRECATION (practically urgent — the runtime v3 depends on has
already been removed from GitHub-hosted runners)
**Verified via:** `gh api repos/actions/checkout/releases/latest` ->
`v7.0.0`, published 2026-06-18, commit `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0`
(confirmed non-annotated/lightweight tag via
`gh api repos/actions/checkout/git/refs/tags/v7.0.0` — `object.type: "commit"`,
so no second SHA-resolution hop needed). Also checked `/tags` (agrees, no
divergence). WebSearch confirmed via
[github.blog: GitHub Actions Transitioning from Node 16 to Node 20](https://github.blog/changelog/2023-09-22-github-actions-transitioning-from-node-16-to-node-20/)
and [github.blog: All Actions will run on Node20 instead of Node16 by default](https://github.blog/changelog/2024-03-07-github-actions-all-actions-will-run-on-node20-instead-of-node16-by-default/).
**What changed:** `actions/checkout@v3` runs on the Node 16 runtime. Node 16
actions were fully migrated off GitHub-hosted runners by spring 2024; self-hosted
runners updated past ~v2.321.0 have also dropped the bundled Node 16 binary,
producing failures like `"/__e/node16/bin/node": stat ...: no such file or
directory"`. In practical terms, `@v3` is highly likely to already be broken on
current runners, not merely "behind." Separately, `v7.0.0` (2026-06-18) adds a
security-motivated breaking change: it refuses to check out fork PR code by
default under `pull_request_target` and `workflow_run` triggers (closes the
"pwn request" class of supply-chain attack), confirmed via GitHub's own
changelog: [Safer pull_request_target defaults for GitHub Actions checkout](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/).
GitHub will backport that same enforcement to all currently-supported major
versions (`v4`, `v5`, `v6`) on **2026-07-16** — 10 days from this review.
**Breaking changes:** Yes, across the jump: (1) Node 16 -> Node 20 runtime
(v4); (2) credential persistence moved to a separate file, changing where
`persist-credentials` writes (v6); (3) fork PR checkout blocked by default
under `pull_request_target`/`workflow_run` unless `allow-unsafe-pr-checkout:
true` is explicitly set (v7). None of these require code changes for typical
`checkout` usage; the third only matters if the workflow actually checks out
fork PR code under those two trigger types.
**Migration steps:** Version bump to
`actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0`. If any
workflow uses `pull_request_target` or `workflow_run` and intentionally checks
out fork PR code, audit that usage before upgrading and add
`allow-unsafe-pr-checkout: true` only if that trust decision is deliberate.
**Security advisories:** None found in OSV.dev for the `actions/checkout`
package itself (`python3 scripts/osv_scan.py "gha:actions/checkout@v3"` ->
`[CLEAN]`, 0 advisories at any version). The Node 16 runtime removal is a
platform-deprecation risk, not a CVE.
**Recommendation:** Treat as urgent, not routine — this is not "nice to
upgrade eventually," it is likely already failing in production and is about to
be affected by the July 16 pwn-request backport regardless.
**Your call:** Upgrade now; decide separately whether any `pull_request_target`/
`workflow_run` workflow needs the `allow-unsafe-pr-checkout` opt-out.

#### actions/upload-artifact: v2 -> v7.0.1

**Risk level:** DEPRECATION (already enforced — not a future risk)
**Verified via:** `gh api repos/actions/upload-artifact/releases/latest` ->
`v7.0.1`, published 2026-04-10, commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`
(lightweight tag, confirmed via `git/refs/tags/v7.0.1` -> `object.type:
"commit"`). `/tags` agrees. WebSearch confirmed via
[github.blog: Deprecation notice: v3 of the artifact actions](https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/)
and related community discussion.
**What changed:** v1/v2 of the artifact actions were deprecated June 30, 2024.
Enforcement (automatic workflow failure) for v1/v2/v3 began January 30, 2025 —
18 months ago relative to this review. Any workflow actually running this pin
today would already be failing every run with "This request has been
automatically failed because it uses a deprecated version of
actions/upload-artifact." v4 was a full backend rewrite: uploads are immutable
(no re-uploading to the same artifact name across jobs), a 500-artifact-per-job
limit was introduced, and file permissions are not preserved on upload (all
files become 644 unless tarred first).
**Breaking changes:** Yes — same-name multi-job uploads now error; POSIX file
permissions are lost unless the workflow tars files before upload; GHES does not
support v4+ (GHES must stay on `v3.2.2`/`v3.2.2-node20` — worth flagging if any
runner in this plan targets GHES rather than github.com).
**Migration steps:** Pin to
`actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1`.
Audit any workflow step that uploads to the same artifact name more than once,
and any step relying on preserved executable bits.
**Security advisories:** None found in OSV.dev
(`python3 scripts/osv_scan.py "gha:actions/upload-artifact@v2"` -> `[CLEAN]`,
0 advisories at any version). This is a functional-breakage risk, not a CVE.
**Recommendation:** Immediate upgrade — this pin is not "stale," it is actively
non-functional right now.
**Your call:** Upgrade now; confirm target runner is github.com (not GHES)
before committing to v4+.

### CORRECTION

#### "actions/checkout@v3 ... current stable": CORRECTION

**Risk level:** CORRECTION
**What is stated:** The plan describes `actions/checkout@v3` as "current
stable."
**What is correct:** Current stable is `v7.0.0` (released 2026-06-18, verified
via `gh api repos/actions/checkout/releases/latest`). `v3` is four major
versions behind and runs on a Node 16 runtime that GitHub-hosted runners have
not supported since spring 2024.
**Why it matters:** A reader who trusts the "current stable" label has no
signal to investigate further, even though the pinned action is likely already
failing in CI. The label actively hides the DEPRECATION finding above rather
than surfacing it.
**Fix:** Change `(current stable)` to `(deprecated — Node 16 runtime, no longer
supported on GitHub-hosted runners; upgrade to v7.0.0, see version delta
above)`.

#### "actions/upload-artifact@v2 ... the latest stable release": CORRECTION

**Risk level:** CORRECTION
**What is stated:** The plan describes `actions/upload-artifact@v2` as "the
latest stable release."
**What is correct:** v2 was deprecated June 30, 2024, and has been actively
enforced (auto-failed) since January 30, 2025. The current latest is `v7.0.1`
(verified via `gh api repos/actions/upload-artifact/releases/latest`,
published 2026-04-10). The label is false by roughly two years relative to
deprecation and about a year and a half past the point where it stopped
working entirely.
**Why it matters:** This is the exact failure mode the skill's own reference
material warns about: a maintainer who trusts "latest stable release" will
never investigate why artifact uploads are failing, or will assume the failure
is unrelated to the action version.
**Fix:** Change `(the latest stable release)` to `(deprecated since June 2024,
enforced failure since Jan 2025 — upgrade to v7.0.1; see version delta above)`.

#### cosign version requirement: internal inconsistency — CORRECTION

**Risk level:** CORRECTION
**What is stated:** The runner inventory section states the requirement as
`cosign >= 1.x`. The verified-versions table in the same plan states `cosign
v3.0.5`.
**What is correct:** These two claims are mutually inconsistent regardless of
which is "more correct." Taken literally, `>= 1.x` would accept any cosign
release from `v1.0.0` (2021) forward — including the entire abandoned v1.x
line, whose last tag is `v1.13.6` (commit `eb4c4368062593e1dd44bb248bd98133859dcc09`,
dated 2024-03-21 per `gh api repos/sigstore/cosign/git/commits/...`) — over two
years stale relative to this review, and pre-dating the SECURITY finding above
entirely (the v1 line predates the v2/v3 rewrite and was never patched for the
newer CVEs). Meanwhile the verified-versions table's `v3.0.5` is itself one
patch behind current (see SECURITY finding above: v3.0.5 is affected by
CVE-2026-39395, fixed in v3.0.6).
**Why it matters:** A runner-provisioning process that enforces the literal
`>= 1.x` constraint could legitimately install a five-year-old, unmaintained
cosign binary and pass validation, while the plan's own verified-versions table
claims a specific, much newer version is in use. This is the exact
cross-section inconsistency pattern the skill flags as CORRECTION-level
regardless of which number is "right" — readers scanning only the runner
inventory would never know a stricter, different version was verified
elsewhere.
**Fix:** Replace `cosign >= 1.x` in the runner inventory with a floor that
matches (or exceeds) the verified-versions table, e.g. `cosign >= 3.0.6`
(the fixed version for CVE-2026-39395; see SECURITY finding above), and keep
both sections in sync going forward.

## Verification Log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| actions/checkout latest release | Bash (`gh api`) | `api.github.com/repos/actions/checkout/releases/latest` | v7.0.0, published 2026-06-18 |
| actions/checkout tags (divergence check) | Bash (`gh api`) | `api.github.com/repos/actions/checkout/tags` | Top tag v7.0.0, matches releases/latest — no divergence |
| actions/checkout v7.0.0 commit SHA / tag type | Bash (`gh api`) | `api.github.com/repos/actions/checkout/git/refs/tags/v7.0.0` | `object.type: commit`, sha `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` — no second hop needed |
| actions/checkout security advisories | Bash (`osv_scan.py`) | OSV.dev querybatch, GitHub Actions ecosystem | `[CLEAN]` — 0 advisories at any version |
| actions/checkout Node 16 deprecation | WebSearch | github.blog changelog (2023-09-22, 2024-03-07) | Node 16 actions migrated off GitHub-hosted runners by spring 2024 |
| actions/checkout v7 pwn-request change + July 16 backport | WebSearch | [github.blog changelog 2026-06-18](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/) | v7 blocks fork PR checkout under pull_request_target/workflow_run by default; backported to v4/v5/v6 on 2026-07-16 |
| actions/upload-artifact latest release | Bash (`gh api`) | `api.github.com/repos/actions/upload-artifact/releases/latest` | v7.0.1, published 2026-04-10 |
| actions/upload-artifact tags (divergence check) | Bash (`gh api`) | `api.github.com/repos/actions/upload-artifact/tags` | Top tag v7.0.1, matches releases/latest — no divergence |
| actions/upload-artifact v7.0.1 commit SHA / tag type | Bash (`gh api`) | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.1` | `object.type: commit`, sha `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` — no second hop needed |
| actions/upload-artifact security advisories | Bash (`osv_scan.py`) | OSV.dev querybatch, GitHub Actions ecosystem | `[CLEAN]` — 0 advisories at any version |
| actions/upload-artifact v2 deprecation / enforcement dates | WebSearch | [github.blog changelog 2024-04-16](https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/) | Deprecated 2024-06-30; enforced failure since 2025-01-30 |
| actions/upload-artifact v4 breaking changes | WebSearch | GitHub docs/community discussion via search | Immutable artifacts, no same-name re-upload, 500/job limit, permissions not preserved, GHES stuck on v3.2.2 |
| cosign latest release / tags | Bash (`gh api`) | `api.github.com/repos/sigstore/cosign/releases/latest` and `/tags` | v3.1.1, published 2026-06-09; tags agree, no divergence |
| cosign security advisories (initial, unversioned path) | Bash (`osv_scan.py`) | OSV.dev querybatch, Go ecosystem, `github.com/sigstore/cosign` | Flagged 6 advisories, 3 of which proved to be false positives from Go import-path version mismatch |
| cosign security advisories (corrected v3 import path) | Bash (`osv_scan.py`) | OSV.dev querybatch, Go ecosystem, `github.com/sigstore/cosign/v3@v3.0.5` | 1 real hit: GHSA-w6c6-c85g-mmv6 / CVE-2026-39395, introduced 3.0.0, fixed 3.0.6 |
| GHSA-w6c6-c85g-mmv6 advisory detail | Bash (`curl` to OSV API) | `api.osv.dev/v1/vulns/GHSA-w6c6-c85g-mmv6` | MODERATE, affects `github.com/sigstore/cosign` 3.0.0–3.0.5, fixed 3.0.6; requires `--check-claims=true` workaround |
| CVE-2026-24122 (GO-2026-4529) status at v3.0.5 | Bash (`curl` to OSV API) | `api.osv.dev/v1/vulns/GO-2026-4529` | Fixed at v3.0.5 on the `/v3` module path — not a live finding for this pin |
| GO-2023-2181 / GO-2024-2718 / GO-2024-2719 relevance to v3.0.5 | Bash (`curl` to OSV API) | `api.osv.dev/v1/vulns/{id}` | All three only affect the abandoned v0/v1 Go module path (fixed in `/v2` at 2.2.1/2.2.4/2.2.4); do not apply to `/v3` — false positives |
| cosign v1.x last release date | Bash (`gh api`) | `api.github.com/repos/sigstore/cosign/tags` + `git/commits/{sha}` | Last v1.x tag `v1.13.6`, committed 2024-03-21 — abandoned line |

## Self-check

- Every version sourced from a live lookup — yes (all three dependencies, both `/releases/latest` and `/tags`).
- Both `releases/latest` AND `tags` checked — yes, for all three; no divergence found in this case (top tag matched top release for all three).
- Every dependency covered by the OSV scan — yes. `actions/checkout` and `actions/upload-artifact` came back `[CLEAN]` (0 advisories at any version, so the GitHub-Actions-tag-range caveat is moot here). `cosign` required correcting the query to the versioned Go import path (`/v3`) after an initial naive query produced false-positive hits against the abandoned `/v0`-`/v1` import path.
- Changelogs read for every upgrade, not just version existence — yes: checkout's Node16->Node20, credential-persistence, and v7 pwn-request changes; upload-artifact's v4 immutability/permissions rewrite and enforcement timeline; cosign's GHSA-w6c6-c85g-mmv6 advisory text.
- SHA fetched for every GitHub Action reference — yes, for `actions/checkout@v7.0.0` and `actions/upload-artifact@v7.0.1`. Both tags are lightweight (`object.type: "commit"`), so no annotated-tag second hop was needed. `cosign` is a standalone CLI binary, not a GitHub Action pinned by tag in the material reviewed, so SHA pinning does not apply to it directly; if this plan installs cosign via a GitHub Action (e.g. `sigstore/cosign-installer`), that action reference needs its own SHA pin and is out of scope of the three claims given for this review.
- Internal consistency checked — yes: the cosign `>= 1.x` vs. `v3.0.5` conflict is called out as its own CORRECTION finding, independent of which number is "right."
- False contemporaneity claims checked — yes: both "current stable" (checkout v3) and "the latest stable release" (upload-artifact v2) are false and each has a dedicated CORRECTION entry, separate from the DEPRECATION entries for the same dependencies.
- Advisory integrity — every CVE/GHSA ID, affected range, and fixed-in version cited above (CVE-2026-39395/GHSA-w6c6-c85g-mmv6, CVE-2026-24122/GO-2026-4529, and the three ruled-out Go advisories) was read directly from an OSV API fetch in this session, not reconstructed from memory.
