# Dependency Lock Review: npm packages for new service

Task type: **implementation / pre-ship lock review** (not an audit of an existing
document). Per the skill workflow, this means findings are presented directly,
ordered by risk, with an open question at the end about shipping timeline since
none was given — timeline changes how urgently the `path-to-regexp` decision
below should be resolved.

Pinned versions under review, all npm:

| Package          | Pinned  |
|------------------|---------|
| lodash           | 4.17.21 |
| axios            | 1.6.0   |
| cross-spawn      | 7.0.6   |
| path-to-regexp   | 6.3.0   |

Checked 2026-07-06 via npm registry, GitHub API, and OSV.dev (live lookups —
see Verification Log at the end; nothing below is from training-data recall).

## Summary (by risk, highest first)

1. **SECURITY — axios 1.6.0 → 1.18.1.** Pinned version sits inside the affected
   range of numerous HIGH-severity advisories (prototype pollution, SSRF,
   credential/header leakage). Not safe to ship as-is.
2. **SECURITY — lodash 4.17.21 → 4.18.1.** Pinned version predates two fixed
   security advisories (prototype pollution, code injection via `_.template`).
   Not safe to ship as-is.
3. **BREAKING-UPGRADE (your call) — path-to-regexp 6.3.0 stays or → 8.4.2.**
   No known vulnerability currently affects 6.3.0, so it is *safe to ship*
   on security grounds alone, but it is a frozen legacy branch (no commits in
   ~22 months) sitting behind a maintained line that has had 3 more ReDoS CVEs
   patched since. Needs an explicit decision, not silent preservation.
4. **ROUTINE / confirmed current — cross-spawn 7.0.6.** Already latest and
   clean of known advisories. Flagging one maintenance-health note only.

---

### axios: 1.6.0 -> 1.18.1

**Risk level:** SECURITY
**Verified via:** OSV.dev batch scan (`osv_scan.py npm:axios@1.6.0`, 2026-07-06);
cross-checked against GitHub release notes at
`api.github.com/repos/axios/axios/releases/tags/v1.15.0`,
`.../v1.16.0`, `.../v1.18.0`; latest confirmed via
`registry.npmjs.org/axios/latest` (`1.18.1`, published 2026-06-21) and
`registry.npmjs.org/axios` `time` map.
**What changed:** The pinned 1.6.0 (Oct 2023) sits inside the affected range
(`introduced 1.0.0`) of a long run of advisories fixed progressively through
1.16.0 (May 2026), most severely:

- SSRF / credential leakage via absolute-URL and `no_proxy` handling —
  GHSA-jr5f-v2jv-69x6 (CVE-2025-27152), GHSA-3p68-rc4w-qgx5 (CVE-2025-62718),
  GHSA-fvcv-3m26-pcqx (CVE-2026-40175), GHSA-m7pr-hjqh-92cm (CVE-2026-42038),
  GHSA-pjwm-pj3p-43mv (CVE-2026-44492), GHSA-pmwg-cvhr-8vh7 (CVE-2026-42043) —
  all HIGH/MODERATE.
- Prototype-pollution gadgets enabling MITM, config/response tampering, and
  credential injection — GHSA-35jp-ww65-95wh (CVE-2026-44494), GHSA-3g43-6gmg-66jw
  (CVE-2026-44495), GHSA-3w6x-2g7m-8v23 (CVE-2026-42044), GHSA-pf86-5x62-jrwf
  (CVE-2026-42033), GHSA-q8qp-cvcw-x6jj (CVE-2026-42264), GHSA-898c-q2cr-xwhg
  (CVE-2026-44490), GHSA-w9j2-pvgh-6h63 (CVE-2026-42041), GHSA-xx6v-rp6x-q39c
  (CVE-2026-42042), GHSA-6chq-wfr3-2hj9 (CVE-2026-42035) — mostly HIGH.
- Proxy-Authorization credential leakage across redirects — GHSA-j5f8-grm9-p9fc
  (CVE-2026-44486), GHSA-p92q-9vqr-4j8v (CVE-2026-44487) — HIGH.
- DoS class: unbounded recursion, missing size checks, ReDoS via cookie name —
  GHSA-4hjh-wcwx-xvwj (CVE-2025-58754), GHSA-62hf-57xw-28j9 (CVE-2026-42039),
  GHSA-43fc-jf86-j433 (CVE-2026-25639), GHSA-hfxv-24rg-xrqf (CVE-2026-44496).
- Historical SSRF: GHSA-8hc4-vh64-cxmj (CVE-2024-39338), fixed 1.7.4.
- Lower-severity: GHSA-445q-vr5w-6q77 (CRLF injection, CVE-2026-42037),
  GHSA-5c9x-8gcm-mpgx (maxBodyLength bypass, CVE-2026-42034), GHSA-vf2m-468p-8v99
  (maxContentLength bypass, CVE-2026-42036), GHSA-xhjh-pmcv-23jw (null-byte
  injection, CVE-2026-42040, LOW).

26 advisories total apply to the `npm:axios` package across its history; every
one of them lists `introduced 1.0.0` (or earlier) with a `fixed` version at or
below 1.16.0, so the 1.6.0 pin is inside the affected window for all of them.
1.17.0 and 1.18.x carry additional hardening (redirect header stripping,
malformed-URL rejection) on top, per the GitHub release notes fetched above.
**Breaking changes:** No major-version bump involved (1.x throughout). Release
notes for 1.15.0/1.16.0/1.18.0 call out only behavior tightening (stricter
`no_proxy`/URL parsing, `Host` header handling, `validateStatusUndefinedResolves`
opt-in) — no removed public APIs identified in the fetched release notes.
**Migration steps:** Version bump `axios` to `1.18.1` and re-run the request/
proxy/interceptor test suite, since several fixes change observable proxy and
redirect behavior (e.g., custom `Host` headers, URL-encoded basic-auth
credentials, stricter `no_proxy` matching) even though no API signature changed.
**Security advisories:** 26 advisories from OSV batch scan, IDs listed above;
all confirmed via the scan's own `affected` ranges (introduced/fixed) rather
than assumed from titles.
**Recommendation:** Do not ship at 1.6.0. Move to 1.18.1 before lock-in — this
is not a routine bump, it closes live SSRF/credential-leak paths.
**Your call:** Confirm 1.18.1, or if there's a reason to stay on the 1.x
minor line closer to 1.6.0, at minimum move to >= 1.16.0 (the last version
that closes every HIGH-severity item above) and treat 1.17.0/1.18.x as a
fast-follow.

---

### lodash: 4.17.21 -> 4.18.1

**Risk level:** SECURITY
**Verified via:** OSV.dev batch scan (`osv_scan.py npm:lodash@4.17.21`,
2026-07-06); GitHub release notes at
`api.github.com/repos/lodash/lodash/releases/tags/4.18.0`; diff
`api.github.com/repos/lodash/lodash/compare/4.17.21...4.17.23`; latest
confirmed via `registry.npmjs.org/lodash/latest` (`4.18.1`, published
2026-04-01).
**What changed:**

- `_.unset` / `_.omit` prototype pollution via `constructor`/`prototype` path
  traversal — GHSA-xxjr-mmjv-4gpg (CVE-2025-13465), fixed in 4.17.23 (commit
  "Prevent prototype pollution on baseUnset function", confirmed in the
  4.17.21...4.17.23 diff).
- A second, related `_.unset` / `_.omit` bypass via array-wrapped path segments
  — GHSA-f23m-r3pf-42rh (CVE-2026-2950), fixed in 4.18.0.
- `_.template` code injection via unguarded `imports` keys — GHSA-r5fr-rjxr-66jc
  (CVE-2026-4800), an incomplete-patch follow-up to CVE-2021-23337, fixed in
  4.18.0.

The pinned 4.17.21 predates all three fixes (4.17.23 and 4.18.0 both come
after it).
**Breaking changes:** No. Per the 4.18.0 release notes, the behavior change is
narrowly that calls which previously silently deleted a built-in-prototype
property now return `false` and leave the target untouched — a hardening, not
an API removal. No other API changes identified.
**Migration steps:** Version bump only, `4.17.21` -> `4.18.1` (4.18.1 itself is
a build-tooling bugfix on top of 4.18.0, no additional behavior change per its
release notes).
**Security advisories:** GHSA-xxjr-mmjv-4gpg / CVE-2025-13465 (MODERATE),
GHSA-f23m-r3pf-42rh / CVE-2026-2950 (MODERATE), GHSA-r5fr-rjxr-66jc /
CVE-2026-4800 (HIGH) — all from the OSV batch scan.
**Recommendation:** Upgrade before shipping. This is a pure security patch
line with no breaking surface — no reason to defer.
**Your call:** Confirm 4.18.1.

---

### path-to-regexp: 6.3.0 -> stay, or move to 8.4.2

**Risk level:** BREAKING-UPGRADE
**Verified via:** OSV.dev batch scan both with pin
(`npm:path-to-regexp@6.3.0` -> CLEAN) and without version
(`npm:path-to-regexp` -> lists all advisories with ranges), 2026-07-06;
`registry.npmjs.org/path-to-regexp` (`dist-tags`: `latest 8.4.2`, `old 6.3.0`);
`api.github.com/repos/pillarjs/path-to-regexp/releases/tags/v7.0.0` and
`.../v8.0.0` for breaking-change notes.
**What changed:** The 6.3.0 pin is **not currently vulnerable** — OSV's
version-matched query returns CLEAN, and the one advisory whose range covers
the 4.x/6.x line (GHSA-9wv6-86v2-598j / CVE-2024-45296, ReDoS via backtracking
regex) lists its affected range as `introduced 4.0.0, fixed 6.3.0` — meaning
6.3.0 is itself the fix commit for that line. However:

- The npm registry itself tags 6.3.0 as `"old"` (a deliberate legacy/compat
  release) while `"latest"` points to 8.4.2, part of a fully rewritten line
  (v7 released June 2024, v8 released September 2024, both post-dating the
  6.3.0 security patch).
- Three additional ReDoS/DoS advisories have landed against the 8.x line since
  the rewrite (GHSA-27v5-c462-wpq7 / CVE-2026-4923, GHSA-j3q9-mxjg-w52f /
  CVE-2026-4926 — both affecting 8.0.0-8.4.0, fixed in 8.4.1+) — meaning 8.x is
  the actively-patched branch and 6.x has had no commits since 2024-09-12
  (~22 months), per registry publish timestamps.
- v7/v8 are explicit, large breaking rewrites: removed per-parameter custom
  regex (`:foo(\\d+)` style), changed optional/wildcard syntax (`{}`/`*name`
  replace `?`/`+`), removed `tokensToRegexp`/`tokensToFunction`, and changed
  `strict`/`endsWith` option names — confirmed directly from the v7.0.0 and
  v8.0.0 GitHub release bodies. The maintainer's own v8.0.0 notes describe the
  rewrite as security-motivated (removing custom-regex ReDoS surface), with a
  linked blog post on the topic.
**Breaking changes:** Yes, if you move to 8.x — full API rewrite, not a
drop-in bump. No breaking changes if you stay on 6.3.0.
**Migration steps:** If staying: none, already on the last patched 6.x
release. If moving to 8.4.2: rewrite path patterns (custom regex captures,
optional-group syntax, wildcard syntax) and update any code touching
`keys`/`tokensToRegexp`/`tokensToFunction`, which no longer exist.
**Security advisories:** None affecting the 6.3.0 pin (OSV batch scan, version-
matched, CLEAN). CVE-2024-45296 was already fixed in 6.3.0 itself.
**Recommendation:** Safe to ship 6.3.0 as-is from a pure vulnerability
standpoint. But it's an unmaintained branch of an actively-patched package —
if this service will run for more than a year, plan the 8.x migration
separately rather than treating 6.3.0 as a permanent answer. Do not silently
carry it forward without a decision on record.
**Your call:** Ship 6.3.0 now and schedule the 8.x rewrite later, or do the
rewrite before this lock-in. Depends on the shipping timeline (see note below).

---

### cross-spawn: 7.0.6 (current)

Already latest (`registry.npmjs.org/cross-spawn/latest` = `7.0.6`, confirmed
2026-07-06) and clean in the OSV batch scan. The one historical advisory,
GHSA-3xgq-45jj-v275 (CVE-2024-21538, ReDoS), has range `introduced 7.0.0, fixed
7.0.5` — the pin at 7.0.6 is past the fix. Safe to ship as-is.

One maintenance-health note (not a version delta, just a flag): the upstream
repo (`moxystudio/node-cross-spawn`) has had no commits since the 7.0.6 release
on 2024-11-18 (`pushed_at` via GitHub API) — about 20 months — with 33 open
issues. Not archived, and there's no known vulnerability today, but if a new
advisory lands against this package there is no recent maintainer activity to
count on for a quick patch. No action needed now; worth a periodic recheck.

---

## Open question for you

This looks like an implementation/lock-in task with no stated shipping
timeline. Timeline changes one decision above: if this service ships in the
next few weeks, I'd lock `path-to-regexp` at 6.3.0 (verified clean) and revisit
the 8.x rewrite as separate follow-up work; if there's no near-term ship
pressure, it may be worth doing the 8.x migration now while the API surface is
still fresh in mind. axios and lodash upgrades are not timeline-sensitive —
recommend those regardless.

## Verification log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| axios 1.6.0 has advisories in range | Bash (osv_scan.py -> OSV.dev querybatch) | `api.osv.dev/v1/querybatch` via `npm:axios@1.6.0` | 26 advisories, all `introduced 1.0.0`/earlier with `fixed` <= 1.16.0 |
| axios latest is 1.18.1 | Bash (curl) | `registry.npmjs.org/axios/latest` | `1.18.1`, dist-tags `latest: 1.18.1` |
| axios 1.16.0 release notes | Bash (curl, GitHub API) | `api.github.com/repos/axios/axios/releases/tags/v1.16.0` | Confirms maxBodyLength/Host-header/basic-auth-decode fixes, no breaking-API removal called out |
| axios 1.15.0 release notes | Bash (curl, GitHub API) | `api.github.com/repos/axios/axios/releases/tags/v1.15.0` | Confirms `no_proxy` SSRF fix and header-injection/cloud-metadata fix |
| axios 1.18.0 release notes | Bash (curl, GitHub API) | `api.github.com/repos/axios/axios/releases/tags/v1.18.0` | Confirms redirect header-stripping and malformed-URL rejection, no breaking removal called out |
| lodash 4.17.21 has advisories in range | Bash (osv_scan.py -> OSV.dev querybatch) | `api.osv.dev/v1/querybatch` via `npm:lodash@4.17.21` | 3 advisories: 2 fixed in 4.18.0, 1 fixed in 4.17.23 |
| lodash latest is 4.18.1 | Bash (curl) | `registry.npmjs.org/lodash/latest` | `4.18.1`, dist-tags `latest: 4.18.1` |
| lodash 4.18.0 fixes _.unset/_.omit and _.template | Bash (curl, GitHub API) | `api.github.com/repos/lodash/lodash/releases/tags/4.18.0` | Confirms both CVEs with commit hashes; no API removal |
| lodash 4.17.23 fixes prototype pollution | Bash (curl, GitHub API) | `api.github.com/repos/lodash/lodash/compare/4.17.21...4.17.23` | Commit "Prevent prototype pollution on baseUnset function" present |
| cross-spawn 7.0.6 is clean and current | Bash (osv_scan.py) + curl | `api.osv.dev/v1/querybatch` (`npm:cross-spawn@7.0.6`) + `registry.npmjs.org/cross-spawn/latest` | CLEAN; latest = 7.0.6 (matches pin) |
| cross-spawn CVE-2024-21538 fixed before pin | Bash (osv_scan.py, no version) | `api.osv.dev/v1/querybatch` (`npm:cross-spawn`) | Range `introduced 7.0.0, fixed 7.0.5`; pin 7.0.6 is past fix |
| cross-spawn maintenance staleness | Bash (curl, GitHub API) | `api.github.com/repos/moxystudio/node-cross-spawn` | `pushed_at: 2024-11-18`, `open_issues: 33`, not archived |
| path-to-regexp 6.3.0 is clean at exact version | Bash (osv_scan.py) | `api.osv.dev/v1/querybatch` (`npm:path-to-regexp@6.3.0`) | CLEAN |
| path-to-regexp 6.3.0 is the fix for CVE-2024-45296 on the 4.x/6.x line | Bash (osv_scan.py, no version) | `api.osv.dev/v1/querybatch` (`npm:path-to-regexp`) | Range `introduced 4.0.0, fixed 6.3.0` among 5 total advisories |
| path-to-regexp latest is 8.4.2, 6.3.0 tagged "old" | Bash (curl) | `registry.npmjs.org/path-to-regexp` | dist-tags `{old: 6.3.0, latest: 8.4.2}` |
| path-to-regexp 8.x has newer ReDoS CVEs | Bash (osv_scan.py, no version) | `api.osv.dev/v1/querybatch` (`npm:path-to-regexp`) | GHSA-27v5-c462-wpq7 and GHSA-j3q9-mxjg-w52f, both range `8.0.0`-`8.4.0` |
| path-to-regexp v7/v8 are breaking rewrites | Bash (curl, GitHub API) | `api.github.com/repos/pillarjs/path-to-regexp/releases/tags/v7.0.0` and `.../v8.0.0` | Release bodies list explicit breaking-change bullets (removed custom regex, changed optional/wildcard syntax, removed exports) |
| path-to-regexp repo not archived, active | Bash (curl, GitHub API) | `api.github.com/repos/pillarjs/path-to-regexp` | `archived: false`, `pushed_at: 2026-06-24` |

### Self-check

- Every version sourced from a live lookup (npm registry `/latest` + full
  package `time`/`dist-tags`, GitHub API releases/tags). None left
  `[UNVERIFIED]`.
- Both `/releases/latest` and `/tags` checked for path-to-regexp (divergence
  found: 6.3.0 doesn't appear in the first page of tags, dist-tags shows it
  explicitly demoted to `"old"`).
- All four dependencies covered by the OSV batch scan; no ecosystem fallback
  needed (npm is fully covered by OSV, no GitHub Actions in this batch so no
  `[REVIEW]` case applied).
- Changelogs/release notes read for every delta (axios x3 releases, lodash
  4.18.0 + diff, path-to-regexp v7/v8 release bodies) — not just version
  existence.
- Internal consistency: no prior document existed to cross-check (this is a
  from-scratch lock, not a review of an existing artifact), so no CORRECTION
  findings apply here.
- No false-contemporaneity claims to correct (task text stated no claims about
  currency — it just listed pins).
- Advisory integrity: every CVE/GHSA ID and range above is traced to a
  specific `osv_scan.py` invocation shown in this log; no ID was reconstructed
  from memory.
