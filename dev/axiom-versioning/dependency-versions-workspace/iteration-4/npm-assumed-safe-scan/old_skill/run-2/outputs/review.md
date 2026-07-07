# Dependency Version Review: npm packages for new service

**Task type:** Implementation (pre-ship dependency lock). The task states the
service is "about to lock dependencies... before shipping," which reads as
near-term/urgent. I did not have a way to ask a follow-up on exact ship date,
so I'm treating this as: ship soon, but not so urgent that security fixes can
be skipped. If the real timeline is longer, the SECURITY items below are still
non-negotiable; only the pacing of the BREAKING-UPGRADE item changes.

**Bottom line up front:** two of the four pinned versions are not safe to ship
as-is (`lodash`, `axios`) and must move. One is behind current but has no
active vulnerability (`path-to-regexp`) — safe to ship, with a caveat. One is
genuinely fine as pinned (`cross-spawn`).

## Inventory (Step 1)

| Package        | Pinned version | Verdict                          |
|----------------|----------------|-----------------------------------|
| lodash         | 4.17.21        | Move to 4.18.1 (SECURITY)         |
| axios          | 1.6.0          | Move to 1.18.1 (SECURITY)         |
| cross-spawn    | 7.0.6          | Keep — already current            |
| path-to-regexp | 6.3.0          | Keep for now (BREAKING-UPGRADE)   |

---

## Findings, grouped by risk (Step 5)

### SECURITY

### lodash: 4.17.21 -> 4.18.1

**Risk level:** SECURITY
**Verified via:** WebFetch `registry.npmjs.org/lodash/latest` (4.18.1) and
`api.github.com/repos/lodash/lodash/tags`; GitHub Advisory Database
`GHSA-r5fr-rjxr-66jc` (CVE-2026-4800), `GHSA-xxjr-mmjv-4gpg` (CVE-2025-13465),
and the follow-on bypass (CVE-2026-2950). Checked 2026-07-06.
**What changed:** 4.17.21 is in the affected range for three stacked
vulnerabilities:

- **CVE-2026-4800** (High, CVSS 8.1) — code injection via `_.template`'s
  `options.imports` key names, which flow into a `Function()` constructor.
  Affects 4.0.0–4.17.23.
- **CVE-2025-13465** (Moderate, CVSS 6.9) — prototype pollution in `_.unset`
  and `_.omit`, letting an attacker delete properties off built-in
  prototypes. Affects 4.0.0–4.17.22.
- **CVE-2026-2950** — a bypass of the CVE-2025-13465 fix using array-wrapped
  path segments (`typeof ['constructor'] === 'object'` slips past the
  string-only guard). Affects up to and including 4.17.23.

**Breaking changes:** Indirect one to watch — lodash shipped **4.18.0** as the
first fix attempt, but it has a packaging regression: `assignWith` is used but
not imported in the built `template.js`, so `lodash-es` throws
`ReferenceError: assignWith is not defined` on import. **Do not pin to
4.18.0.** 4.18.1 contains both the real fix and the regression fix.
**Migration steps:** Bump straight to 4.18.1 (skip 4.18.0 entirely). No API
changes for normal usage.
**Security advisories:** CVE-2026-4800 (High), CVE-2025-13465 (Moderate),
CVE-2026-2950 (bypass of the previous fix, no independent CVSS confirmed in
sources reviewed).
**Recommendation:** Upgrade to 4.18.1 now — this is a security release, not a
feature bump, and the highest-severity issue (CVE-2026-4800, CVSS 8.1) is a
code-injection primitive.
**Your call:** Approve the bump to 4.18.1 in the lockfile before shipping.

### axios: 1.6.0 -> 1.18.1

**Risk level:** SECURITY
**Verified via:** WebFetch `registry.npmjs.org/axios/latest` (1.18.1);
`github.com/axios/axios/security/advisories` (20 total advisories, fetched
individual GHSA pages for version ranges); WebSearch cross-referenced against
Snyk ("1.18.1 is the latest non-vulnerable version") and the HeroDevs
April-2026 axios CVE tracker (used only to cross-check, not as sole source).
Checked 2026-07-06.
**What changed:** 1.6.0 falls inside the affected range of at least six
confirmed CVEs plus one of today's newly-published advisories:

- **CVE-2024-39338** (SSRF via absolute URL handling), affects 1.3.2–1.7.3,
  fixed 1.7.4.
- **CVE-2025-27152** (SSRF + credential leakage via baseURL handling),
  affects 1.0–1.8.1, fixed 1.8.2.
- **CVE-2025-58754** (DoS — no max size check on response data), affects
  1.0–1.11.x, fixed 1.12.0.
- **CVE-2026-25639** (DoS via `__proto__` key in `mergeConfig`), affects
  1.0–1.13.4, fixed 1.13.5.
- **CVE-2025-62718** (NO_PROXY hostname-normalization bypass -> SSRF),
  affects everything before 1.15.0, fixed 1.15.0 (a later incomplete-fix
  variant for IPv4-mapped IPv6 addresses was also reported and patched).
- **CVE-2026-40175** (cloud metadata exfiltration via header injection),
  affects everything before 1.15.0, fixed 1.15.0. Severity is disputed
  between sources: CSA Singapore rated it CVSS 10/critical, while the GitHub
  Advisory itself rates it Moderate (CVSS 4.8), and the axios maintainer
  publicly pushed back on the higher rating, noting Node's HTTP stack already
  blocks the CRLF injection this depends on. Treat as real but likely
  over-rated by some trackers.
- **GHSA-mmx7-hfxf-jppx** (published *today*, 2026-07-06, no CVE assigned
  yet) — prototype-pollution gadgets that let inherited `data`, `proxy`, or
  `paramsSerializer` values alter request construction. Affected range is
  `>=1.0.0` (i.e., all of 1.x) up to the fix in 1.18.0. This one directly
  covers 1.6.0.

Four more advisories were also published today (`GHSA-gcfj-64vw-6mp9` High,
`GHSA-hcpx-6fm6-wx23`, `GHSA-pmv8-rq9r-6j72`, `GHSA-xj6q-8x83-jv6g`), but their
affected ranges start at 1.15.1/1.15.2 — they don't reach back to 1.6.0, but
they do confirm 1.18.1 (not some older "known good" version like 1.15.1) is
the correct target, since those ranges are already patched in 1.18.0.

**Breaking changes:** Yes, several, accumulated across the 1.x line:

- URL params are now percent-encoded by default; a backend expecting
  `qs`-style raw brackets needs a custom `paramsSerializer`.
- `null` params now serialize as empty strings; `undefined` params are
  omitted (this changed partway through 1.x).
- Packaging shifted CJS/ESM defaults, which can break bundler configs or
  mocks that reached into axios internals; axios no longer exports internals
  at all — only the public API.
- Recent axios requires Node.js >= 18; anything on Node 14/16 is blocked from
  upgrading at the runtime level.

**Migration steps:** Target **1.18.1** directly (not 1.15.1 — see above).
**Do not pin to 1.14.1 or 0.30.4 under any circumstances**: on 2026-03-31 an
attacker compromised the axios maintainer's npm credentials and published
those two versions with a trojanized dependency (`plain-crypto-js`) that
dropped a cross-platform RAT via a postinstall hook. Both were pulled within
~3 hours, but if either is anywhere in a lockfile or cache, treat that
environment as compromised (rotate credentials, don't just re-pin). Given
this is a pre-ship service (no production traffic yet), I'd skip the
staged-minor-by-minor approach some guides recommend for live services and go
straight to 1.18.1 with a full regression pass, since there's no running
traffic to protect mid-upgrade.
**Security advisories:** See CVE list above. Net effect: 1.6.0 has zero of the
fixes released since October 2023; 1.18.1 has all of them as of this check.
**Recommendation:** Move to 1.18.1. This library has had new disclosures
every few months through 2026, including three published the same day as
this review — don't let the lockfile drift once set.
**Your call:** Approve 1.18.1, and budget a regression pass for the params
serialization and CJS/ESM changes accumulated over 12 minor versions.

### BREAKING-UPGRADE

### path-to-regexp: 6.3.0 -> 8.4.2 (no active CVE, but flagging staleness)

**Risk level:** BREAKING-UPGRADE (not SECURITY — see below)
**Verified via:** WebFetch `registry.npmjs.org/path-to-regexp` (dist-tags:
`latest` 8.4.2, `old` 6.3.0, `express` 0.1.13) and
`api.github.com/repos/pillarjs/path-to-regexp/tags`; GitHub Advisory Database
`GHSA-9wv6-86v2-598j` (CVE-2024-45296), `GHSA-rhx6-c78j-4q9w`
(CVE-2024-52798), `GHSA-37ch-88jc-xwx2` (CVE-2026-4867). Checked 2026-07-06.
**What changed / correction of a plausible assumption:** path-to-regexp shows
up heavily in CVE search results, which could lead to assuming 6.3.0 is
vulnerable — it is not. CVE-2024-45296's own affected-range list is
`>=4.0.0, <6.3.0`, meaning **6.3.0 is the patched version** for that
ReDoS lineage, not an affected one. The two follow-up "incomplete fix" CVEs
(CVE-2024-52798, CVE-2026-4867) only apply to the legacy `0.1.x` branch
(npm-tagged `express`, used internally by Express 4's vendored fork) — they
do not touch the 6.x line. So **6.3.0 currently has no open CVE.**

The real issue is maintenance posture, not an active vulnerability: npm's
`old` dist-tag on 6.3.0 confirms the 6.x branch was frozen there —
development jumped straight to 7.0.0 and then the 8.x line. The actively
maintained 8.x branch itself picked up two new ReDoS CVEs in March 2026
(CVE-2026-4926, CVE-2026-4923, both fixed in 8.4.0). If a similar class of
bug is ever found in logic shared with 6.x, there's no public commitment that
the frozen branch would get a backport.
**Breaking changes:** Yes, substantial, if/when moving to 8.x — v7/v8 removed
the Express-style `?`, `*`, `+` path modifiers in favor of brace syntax
(`{}`) for optional segments and named wildcards (`*path` instead of a bare
`*`); unescaped `(`, `)`, `[`, `]`, `?`, `+`, `!` are now reserved and must be
escaped. Any existing route strings using the old modifier syntax will throw
or silently misbehave.
**Migration steps:** No action required to ship at 6.3.0 — there's no active
CVE forcing a move. If/when upgrading to 8.4.2: audit every route pattern for
`?`/`*`/`+` modifiers and bare wildcards, and run the full route test suite
before merging. Note this decision is independent of Express version choice:
Express 4 vendors its own `0.1.x` fork (npm's `express` dist-tag) and isn't
affected by whether this project's own path-to-regexp pin moves.
**Security advisories:** None currently open against 6.3.0. CVE-2024-45296
(fixed at 6.3.0, not applicable), CVE-2024-52798 and CVE-2026-4867 (0.1.x
branch only, not applicable to 6.x).
**Recommendation:** Safe to ship at 6.3.0 for this release. Don't read "no
CVE" as "current," though — file a follow-up ticket to move to 8.x on a
deliberate timeline, since the 6.x branch has no forward security
commitment and a two-major-version gap only gets more expensive to close
later.
**Your call:** Ship 6.3.0 now and schedule the v8 migration separately, or
absorb the breaking-change cost now while pre-launch and there are no
external route consumers yet?

---

## Already current (Step 4 — brief confirmation, no decision needed)

### cross-spawn: 7.0.6

**Verified via:** WebFetch `registry.npmjs.org/cross-spawn` (dist-tags:
`latest` = `7.0.6`, matching the pinned version); GitHub Advisory
`GHSA-3xgq-45jj-v275` (CVE-2024-21538, ReDoS, fixed in 7.0.5 — 7.0.6 already
contains the fix); WebSearch on maintenance status (Snyk: maintenance rated
"Inactive," no release in roughly 2 years). Checked 2026-07-06.

7.0.6 is npm's current `latest` and already carries the fix for the only
known CVE against this package. This one is genuinely safe to ship as
pinned — no change needed.

One non-blocking note: the package hasn't released in ~2 years and is
flagged as maintenance-inactive. That's not a vulnerability today, and no
broadly-adopted successor exists yet, so there's nothing to action now beyond
keeping an eye on it if a future CVE surfaces with no maintainer response.

No evidence of a supply-chain compromise (malicious version) was found for
lodash, cross-spawn, or path-to-regexp in the sources checked — unlike axios,
which had the March 2026 incident described above.

---

## Verification Log (Step 6)

| Claim | Tool | Source | Finding |
|---|---|---|---|
| lodash latest is 4.18.1 | WebFetch | `registry.npmjs.org/lodash/latest` | Confirmed |
| lodash GitHub tags include 4.17.21, 4.17.23, 4.18.0, 4.18.1 | WebFetch | `api.github.com/repos/lodash/lodash/tags` | Confirmed; no tag divergence from npm found |
| lodash 4.17.21 vulnerable to CVE-2025-13465 | WebFetch | `github.com/advisories/GHSA-xxjr-mmjv-4gpg` | Affected `>=4.0.0 <=4.17.22`; patched 4.17.23 |
| lodash vulnerable to CVE-2026-2950 (bypass) | WebSearch + WebFetch | `github.com/lodash/lodash/security/advisories`, Snyk SNYK-JS-LODASHES-15869621 | Affects up to 4.17.23; needs 4.18.1 (4.18.0 broken) |
| lodash 4.17.21 vulnerable to CVE-2026-4800 (`_.template` code injection) | WebFetch | `github.com/advisories/GHSA-r5fr-rjxr-66jc` | Affected `4.0.0-4.17.23`, High CVSS 8.1, patched 4.18.0 |
| lodash 4.18.0 has a packaging regression | WebSearch | GitHub discussion #6167/#6174, Snyk | Confirmed: `assignWith` not imported, fixed in 4.18.1 |
| axios latest is 1.18.1 | WebFetch | `registry.npmjs.org/axios/latest` | Confirmed |
| axios 1.6.0 vulnerable to CVE-2024-39338, CVE-2025-27152, CVE-2025-58754, CVE-2026-25639, CVE-2025-62718, CVE-2026-40175 | WebSearch | axios GHSA pages, HeroDevs tracker (cross-check only) | All ranges include 1.6.0; fixed versions range 1.7.4 to 1.15.0 |
| CVE-2026-40175 severity disputed | WebFetch + WebSearch | GHSA page (Moderate/4.8) vs CSA Singapore alert (Critical/10) | Confirmed disagreement between sources; noted both |
| Three axios advisories published 2026-07-06 don't reach back to 1.6.0, but confirm 1.18.1 as correct floor | WebFetch | `GHSA-gcfj-64vw-6mp9`, `GHSA-hcpx-6fm6-wx23`, `GHSA-pmv8-rq9r-6j72`, `GHSA-xj6q-8x83-jv6g` | Affected ranges start at >=1.15.1/1.15.2; patched >=1.18.0 |
| One 2026-07-06 axios advisory (`GHSA-mmx7-hfxf-jppx`) does reach 1.6.0 | WebFetch | `github.com/axios/axios/security/advisories/GHSA-mmx7-hfxf-jppx` | Affected `>=1.0.0`, patched >=1.18.0 |
| axios 1.14.1 / 0.30.4 were compromised (malicious, not just vulnerable) | WebSearch | Huntress, Trend Micro, Microsoft Security Blog, axios postmortem issue #10636 | Confirmed: npm account hijack, trojanized `plain-crypto-js` dependency, ~3hr exposure window, 2026-03-31 |
| axios 1.18.1 has no currently open CVE | WebSearch | Snyk axios package page | "Latest non-vulnerable version: 1.18.1" |
| axios breaking changes 1.6->1.18 (params encoding, CJS/ESM, Node >=18) | WebSearch | axios upgrade guide (axios.rest), HeroDevs tracker | Cross-referenced, consistent across sources |
| cross-spawn latest is 7.0.6 (== pinned) | WebFetch | `registry.npmjs.org/cross-spawn` | Confirmed, dist-tag `latest` = 7.0.6 |
| cross-spawn 7.0.6 patched against CVE-2024-21538 | WebSearch | `github.com/advisories/ghsa-3xgq-45jj-v275` | Affected `<7.0.5`; 7.0.6 is patched |
| cross-spawn maintenance inactive, no release ~2 years | WebSearch | Snyk cross-spawn package page | Confirmed |
| No supply-chain compromise found for lodash, cross-spawn, path-to-regexp | WebSearch | Multiple (Unit42, Trend Micro, Snyk, Mend) searches per package | No incident found; each only appears as a CVE/transitive-dependency case, not a hijacked-package case |
| path-to-regexp latest is 8.4.2; 6.3.0 tagged `old`; 0.1.13 tagged `express` | WebFetch | `registry.npmjs.org/path-to-regexp` | Confirmed all three dist-tags |
| path-to-regexp GitHub tags stop at 6.3.0 for the 6.x line | WebFetch | `api.github.com/repos/pillarjs/path-to-regexp/tags` | Confirmed, no 6.3.x releases after 6.3.0 |
| path-to-regexp 6.3.0 is the patched version for CVE-2024-45296, not vulnerable | WebFetch | `github.com/advisories/ghsa-9wv6-86v2-598j` | Affected ranges include `>=4.0.0, <6.3.0` — 6.3.0 itself excluded |
| CVE-2024-52798 and CVE-2026-4867 only affect path-to-regexp 0.1.x branch | WebSearch + WebFetch | GHSA-rhx6-c78j-4q9w, GHSA-37ch-88jc-xwx2 | Both scoped to `<=0.1.12` / `<0.1.12`; 6.x not in range |
| path-to-regexp 8.x had its own new ReDoS CVEs in March 2026 | WebSearch | CVE-2026-4867 search results referencing CVE-2026-4926/CVE-2026-4923 | Both affect `>=8.0.0`, fixed in 8.4.0 |
| path-to-regexp v6->v8 breaking changes (optional syntax, wildcards) | WebSearch | GitHub repo README/release notes, NestJS v11 issue #16095 | Confirmed via multiple downstream breakage reports |

### Self-check

- Every version sourced from a live lookup — yes, no `[UNVERIFIED]` items.
- Both `/releases/latest`-equivalent and `/tags` checked for lodash and
  path-to-regexp (both are npm packages without formal GitHub "Releases" for
  every version, so tags were the authoritative GitHub-side check; npm
  registry `/latest` plus full dist-tags were also checked for divergence).
- Every dependency covered by at least one security search — yes, all four.
- Changelogs / breaking-change sources read for both upgrades recommended
  (lodash, axios), and for the path-to-regexp migration path even though no
  upgrade is being recommended right now.
- SHA pinning: not applicable — these are npm registry packages, not GitHub
  Actions references.
- Internal consistency: no conflicting statements about the same dependency
  within this report.
- False contemporaneity claims: none to correct — the task only listed pinned
  versions without asserting any of them were current or safe, so no
  CORRECTION-format findings apply here.
