# Dependency Version Review: Pre-Ship Lock for New Service

Scope: npm — `lodash@4.17.21`, `axios@1.6.0`, `cross-spawn@7.0.6`, `path-to-regexp@6.3.0`.
This is a review of already-pinned versions, so findings are presented directly by
risk level (no shipping-timeline question).

## Summary (highest risk first)

1. **axios 1.6.0 → 1.18.1** — SECURITY (critical exposure)
2. **lodash 4.17.21 → 4.18.1** — SECURITY
3. **path-to-regexp 6.3.0 → 8.4.2** — DEPRECATION (branch abandoned; no live CVE today)
4. **cross-spawn 7.0.6** — already current, no action

---

### axios: 1.6.0 -> 1.18.1

**Risk level:** SECURITY
**Verified via:** WebFetch `registry.npmjs.org/axios/latest` (1.18.1) + `api.github.com/repos/axios/axios/releases/latest` (v1.18.1, published 2026-06-21) + `/tags` (v1.18.1 top); WebFetch NVD `CVE-2026-40175` and GHSA-fvcv-3m26-pcqx; WebFetch `api.github.com/advisories?affects=axios`; WebFetch `api.github.com/repos/axios/axios/security-advisories`.
**What changed:** 1.6.0 predates three separate rounds of coordinated security fixes (1.15.0, 1.16.0, 1.18.0), plus a supply-chain compromise event in between.
**Breaking changes:** No breaking changes for typical usage within the 1.x line (the `params` bracket-encoding / default-export changes some guides describe are from the 0.x→1.x jump, already behind you at 1.6.0). 1.16.0 tightened content-length enforcement and protocol-parsing strictness — worth a smoke test if you rely on streaming uploads or custom proxy configs.
**Migration steps:** Bump directly to `1.18.1` (no intermediate pins needed). Pin the exact version (no `^`/`~`) rather than a range — see supply-chain note below.
**Security advisories:**

- **CVE-2026-40175** — header-injection/prototype-pollution gadget chain enabling cloud
  metadata credential theft (AWS IMDSv2/GCP/Azure). GitHub scores it Medium (CVSS 4.8);
  Red Hat scores it Critical (CVSS 9.0) — the two differ because GitHub's score assumes
  the attacker needs a prototype-pollution gadget elsewhere in the stack, while Red Hat
  scores the realized impact. Affects `<1.15.0`, fixed in `1.15.0`.
- **CVE-2025-62718** — NO_PROXY hostname normalization bypass (Moderate). Affects
  `<1.15.0`, fixed `1.15.0`.
- **CVE-2025-27152** — SSRF/credential leak via absolute URL bypassing `baseURL` (High).
  Fixed `1.8.0`. [Sourced via WebSearch/HeroDevs summary, not independently re-confirmed
  against the GHSA API this pass — treat as partially verified.]
- **CVE-2025-58754** — DoS via unbounded response size (High). Fixed `1.12.0`. [Same
  partial-verification caveat as above.]
- **8 further High/Medium CVEs** (CVE-2026-44486 through -44496 range) — proxy-credential
  leaks on redirect, prototype-pollution MITM via `config.proxy`, NO_PROXY bypass via
  IPv4-mapped IPv6, ReDoS via unescaped cookie name, fetch-adapter body-limit bypass.
  All fixed in **1.16.0**. Confirmed via `api.github.com/advisories?affects=axios`.
- **9 additional GHSA-tracked issues** (CVE IDs not yet assigned as of 2026-07-06, the
  date they were published) — recursive `formToJSON`/`formDataToJSON` DoS, prototype
  pollution in auth/config merge, `maxBodyLength`/`maxDepth` bypass in fetch and HTTP/2
  adapters. Fixed in **1.18.0**. Confirmed via
  `api.github.com/repos/axios/axios/security-advisories`.
- **Supply-chain compromise:** `1.14.1` and legacy `0.30.4` were published malicious on
  2026-03-31 (attributed to Sapphire Sleet / North Korean state actor per Microsoft
  Security Blog); rotate credentials if either was ever installed. Reinforces exact-pin
  + lockfile-integrity discipline.

**Recommendation:** Upgrade immediately to `1.18.1`. This is not routine drift — 1.6.0
is missing three rounds of security fixes including a credential-theft-capable chain.
**Your call:** Approve the direct jump to `1.18.1` and confirm exact (non-range) pinning.

### lodash: 4.17.21 -> 4.18.1

**Risk level:** SECURITY
**Verified via:** WebFetch `registry.npmjs.org/lodash/latest` (4.18.1); `api.github.com/repos/lodash/lodash/tags` (4.18.1 top); `api.github.com/advisories?affects=lodash`; GHSA-f23m-r3pf-42rh and GHSA-r5fr-rjxr-66jc advisory pages.
**What changed:** Two rounds of fixes since 4.17.21. `4.17.23` patched a
prototype-pollution vector in `_.unset`/`_.omit` (CVE-2025-13465) — but that patch was
later found bypassable via array-wrapped path segments and primitive roots, properly
fixed in `4.18.0` (CVE-2026-2950). `4.18.0` separately fixed a code-injection hole in
`_.template` via unvalidated `imports` keys (CVE-2026-4800) — an incomplete-fix
follow-up to the older CVE-2021-23337. `4.18.1` is a same-day packaging/doc follow-up
(also resyncs the `lodash.*` modular packages).
**Breaking changes:** No functional breakage for normal usage. `_.template` calls with
forbidden characters in `imports` keys now throw instead of silently executing;
`_.unset`/`_.omit` calls that previously (incorrectly) mutated built-in prototypes now
no-op and return `false`.
**Migration steps:** Version bump only.
**Security advisories:** CVE-2025-13465 (Medium, fixed 4.17.23), CVE-2026-2950 (Medium,
fixed 4.18.0), CVE-2026-4800 (High, code injection, fixed 4.18.0). All three affect
4.17.21.
**Recommendation:** Upgrade immediately. `lodash` sits deep in most dependency trees; a
code-injection-capable bug in `_.template` isn't something to defer. "Hasn't changed in
years" is exactly the assumption this review is meant to catch — 4.17.21 looked stable
but was never re-verified against 2025-2026 findings.
**Your call:** Approve bump to `4.18.1`.

### path-to-regexp: 6.3.0 -> 8.4.2

**Risk level:** DEPRECATION
**Verified via:** WebFetch `registry.npmjs.org/path-to-regexp/latest` (8.4.2);
`api.github.com/repos/pillarjs/path-to-regexp/releases` + `/tags` (both show v8.4.2 top,
no divergence); `api.github.com/advisories?affects=path-to-regexp` (5 CVEs across all
branches); WebSearch on Express 5 migration guide for breaking-change specifics.
**What changed:** The 6.x line has had **zero releases since 6.3.0 (Sept 12, 2024)**.
All 2026 maintenance went to the 0.1.x legacy line (last patch 0.1.13, Mar 2026) and the
8.x line (latest 8.4.2, Apr 2026). No advisory currently lists 6.3.0 as affected — it
happens to be sitting exactly on the fix version for the one CVE that ever touched the
6.x branch. But three separate ReDoS CVEs surfaced and were fixed elsewhere in 2026
(0.1.13, and twice on 8.x up to 8.4.0); the 6.x line has had no chance to inherit any
equivalent scrutiny or fix because it's not being touched.
**Breaking changes:** Yes, moving to 8.x: bare `*` wildcards must be named (`*splat`);
the `?` optional-character suffix is removed (use `{}` groups); embedding raw
regex/alternation characters (`()[]?+!`) in path strings is no longer supported (use an
array of path strings instead); parameter names must be valid JS identifiers or quoted.
If consumed via Express, this aligns with the Express 4→5 migration (Express 5 ships
path-to-regexp v8); Express publishes codemods for this. Requires Node.js >= 18.
**Security advisories:** No advisory currently affects 6.3.0. CVE-2024-45296 is fixed
exactly at 6.3.0. CVE-2024-52798 and CVE-2026-4867 are scoped to the 0.1.x branch only.
CVE-2026-4923 and CVE-2026-4926 are scoped to 8.0.0–8.3.x only (fixed 8.4.0). None found
via WebSearch/GitHub Advisory API that touch 6.x beyond the one already-fixed CVE.
**Recommendation:** Not an urgent security fix, but don't treat 6.3.0 as a durable pin —
it's on a dead branch nobody is auditing. Since this is a new, pre-ship service with no
legacy routes to untangle, migrating straight to 8.4.2 now is cheaper than doing it later
under production constraints.
**Your call:** Migrate to `8.4.2` pre-ship (recommended), or explicitly accept the
abandoned-branch risk and put a date on revisiting it.

### cross-spawn: 7.0.6 — already current

**Verified via:** WebFetch `registry.npmjs.org/cross-spawn/latest` (7.0.6, exact match);
`api.github.com/repos/moxystudio/node-cross-spawn/tags` (v7.0.6 top; the repo doesn't
use GitHub Releases, tags-only); `api.github.com/advisories?affects=cross-spawn`.
**Finding:** Only one advisory exists for this package — CVE-2024-21538 (ReDoS, High),
affecting `>=7.0.0 <7.0.5` and `<6.0.6`, fixed in `7.0.5`/`6.0.6`. The pinned `7.0.6`
postdates the fix and matches the current npm/GitHub latest exactly. No further
advisories found via the GitHub Advisory API.
**Note (informational, not a delta):** No release in ~2 years; Snyk flags maintenance as
"inactive" but also explicitly lists 7.0.6 as "the latest non-vulnerable version." Safe
to ship as-is.

---

## Verification Log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| lodash latest is 4.18.1 | WebFetch | `registry.npmjs.org/lodash/latest`, `api.github.com/repos/lodash/lodash/tags` | Confirmed, releases and tags agree |
| lodash 4.17.21 affected by CVE-2025-13465 / CVE-2026-2950 / CVE-2026-4800 | WebFetch | `api.github.com/advisories?affects=lodash`, GHSA-f23m-r3pf-42rh, GHSA-r5fr-rjxr-66jc | Confirmed, all three in range |
| axios latest is 1.18.1 | WebFetch | `registry.npmjs.org/axios/latest`, `/releases/latest`, `/tags` | Confirmed, all three agree |
| axios 1.6.0 affected by CVE-2026-40175 | WebFetch | NVD, GHSA-fvcv-3m26-pcqx | Confirmed; CVSS scoring discrepancy between GitHub (4.8) and Red Hat (9.0) noted |
| axios CVE-2026-444xx series (8 CVEs), fixed 1.16.0 | WebFetch | `api.github.com/advisories?affects=axios` | Confirmed via GitHub Advisory API |
| axios 9 further GHSA (no CVE yet), fixed 1.18.0 | WebFetch | `api.github.com/repos/axios/axios/security-advisories` | Confirmed, published 2026-07-06 |
| axios CVE-2025-27152, CVE-2025-58754 fix versions | WebSearch | HeroDevs blog summary | [PARTIALLY VERIFIED] — not independently cross-checked against GHSA API this pass |
| axios v1.14.1/v0.30.4 supply-chain compromise | WebSearch | Microsoft Security Blog, CSA Singapore | Confirmed via independent secondary sources |
| path-to-regexp latest is 8.4.2 | WebFetch | `registry.npmjs.org/path-to-regexp/latest`, `/releases`, `/tags` | Confirmed, all agree |
| path-to-regexp 6.3.0 unaffected by any live CVE | WebFetch | `api.github.com/advisories?affects=path-to-regexp` | Confirmed — all 5 CVEs scoped to 0.1.x or 8.x branches |
| path-to-regexp 6.x branch has had no release since 2024-09-12 | WebFetch | `api.github.com/repos/pillarjs/path-to-regexp/releases`, `/tags` | Confirmed via tag dates |
| path-to-regexp v8 breaking changes | WebSearch | expressjs.com/en/guide/migrating-5/ | Confirmed |
| cross-spawn latest is 7.0.6 (matches pin) | WebFetch | `registry.npmjs.org/cross-spawn/latest`, `/tags` | Confirmed |
| cross-spawn 7.0.6 has no unpatched advisory | WebFetch | `api.github.com/advisories?affects=cross-spawn` | Confirmed — only CVE-2024-21538, fixed 7.0.5, predates pin |

**Self-check:** All versions sourced from live lookups except the two flagged
`[PARTIALLY VERIFIED]` axios CVEs. Both releases and tags checked for all four packages,
no divergence found. Every dependency covered by a dedicated advisory-API security
search. Changelogs/advisory text read for every upgrade, not just version existence. No
internal-consistency conflicts found across sources for the same dependency (the
CVSS-scoring split on CVE-2026-40175 is a genuine dual-source disagreement, not an
error, and is called out explicitly). No false-contemporaneity claims were present in
the original task to correct — the user asked for an assessment, not a review of an
existing document's claims — so no CORRECTION entries apply here.
