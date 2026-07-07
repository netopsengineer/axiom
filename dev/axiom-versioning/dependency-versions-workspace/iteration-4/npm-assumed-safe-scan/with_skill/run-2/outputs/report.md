# Dependency Lock Review — npm (pre-ship gate)

**Task:** For each of the four npm packages currently pinned for a new service,
determine whether it is safe to ship as-is, or must move to a different exact
version before shipping.

**Scope:** `lodash@4.17.21`, `axios@1.6.0`, `cross-spawn@7.0.6`,
`path-to-regexp@6.3.0` (npm ecosystem only).

**Bottom line up front:**

| Package | Pinned | Ship as-is? | Move to |
|---|---|---|---|
| lodash | 4.17.21 | **No** | `4.18.1` |
| axios | 1.6.0 | **No** | `1.18.1` |
| cross-spawn | 7.0.6 | **Yes** | (no change — already current) |
| path-to-regexp | 6.3.0 | **Conditional yes** — no known vuln, but see BREAKING-UPGRADE decision below | your call: stay on `6.3.0` or plan a `8.4.2` migration |


## Findings, by risk level

### 1. SECURITY

### lodash: 4.17.21 -> 4.18.1

**Risk level:** SECURITY
**Verified via:** `scripts/osv_scan.py npm:lodash@4.17.21` (OSV.dev batch query, live) confirming 3 advisories against the exact pinned version; `https://registry.npmjs.org/lodash/latest` (current latest is `4.18.1`); `https://api.github.com/repos/lodash/lodash/tags` (confirms `4.18.1`, `4.18.0` exist above `4.17.21`); WebSearch "lodash 4.18.0 release date changelog CVE-2026-4800 CVE-2026-2950" cross-referencing NVD/GHSA/IBM security bulletins for narrative context on the two 2026 CVEs.
**What changed:** `4.17.21` has been lodash's "assumed safe" pin for years, but three advisories were published against it after that assumption would have formed:

- `GHSA-xxjr-mmjv-4gpg` / **CVE-2025-13465** (MODERATE) — prototype pollution in `_.unset`/`_.omit`. Affects `4.0.0` through `4.17.22` (fixed in `4.17.23`).
- `GHSA-f23m-r3pf-42rh` / **CVE-2026-2950** (MODERATE) — the `4.17.23` fix above only guarded string-keyed paths; array-wrapped path segments (e.g. `[['constructor'],['keys']]`) bypass it, still permitting deletion of `Object.prototype`/`Number.prototype`/`String.prototype` properties. Fixed in `4.18.0`.
- `GHSA-r5fr-rjxr-66jc` / **CVE-2026-4800** (HIGH, CVSS reported 8.1–9.8 depending on source) — `_.template`'s `options.imports` key names were never validated the way the `variable` option was after CVE-2021-23337; untrusted import key names flow into the same `Function()` constructor sink, enabling code injection at template-compile time. Fixed in `4.18.0`.

All three affect the exact pinned version `4.17.21` per the live OSV query (npm ecosystem version-matches automatically).
**Breaking changes:** No for typical usage. `_.template` now throws `"Invalid imports option passed into _.template"` if import key names contain characters forbidden as JS identifiers — this only affects callers who were passing attacker-influenced or unusually-named import keys, which was already the vulnerable pattern.
**Migration steps:** Version bump only, `4.17.21` -> `4.18.1` (latest; `4.18.0` was the fix release, `4.18.1` is a subsequent point release). No API changes required.
**Security advisories:** CVE-2025-13465 (GHSA-xxjr-mmjv-4gpg, MODERATE), CVE-2026-2950 (GHSA-f23m-r3pf-42rh, MODERATE), CVE-2026-4800 (GHSA-r5fr-rjxr-66jc, HIGH) — all confirmed via live OSV.dev query against the pinned version.
**Recommendation:** Do not ship on `4.17.21`. Move to `4.18.1` before lock-in. This is the clearest case in this review of training-data assumption being wrong: `4.17.21` was current and "settled" knowledge for a long time, but it has unpatched, disclosed vulnerabilities today, one of them HIGH severity code injection.
**Your call:** Bump to `4.18.1` (recommended) or, at minimum, `4.18.0`.

### axios: 1.6.0 -> 1.18.1

**Risk level:** SECURITY
**Verified via:** `scripts/osv_scan.py npm:axios@1.6.0` (OSV.dev batch query, live) returning **26** advisories that match the exact pinned version; `https://registry.npmjs.org/axios/latest` (current latest `1.18.1`); `https://api.github.com/repos/axios/axios/releases/latest` (tag `v1.18.1`, published June 21, 2026); WebSearch "axios changelog 1.7 1.8 1.9 1.10 breaking changes minimum node version" for migration-relevant behavior changes across the range; confirmed `axios@1.18.1` comes back `[CLEAN]` on a follow-up OSV scan.
**What changed:** `1.6.0` (Nov 2023) sits at the very start of a long run of security fixes across the `1.x` line — 26 separate advisories apply to it, all confirmed by OSV's own version-range matching against `1.6.0`. Highlights (fixed-in shown where OSV reported it):

| CVE | Severity | Summary | Fixed in |
|---|---|---|---|
| CVE-2025-27152 | HIGH | SSRF + credential leakage via absolute URL overriding `baseURL` | 1.8.2 |
| CVE-2024-39338 | HIGH | SSRF in default adapter | 1.7.4 |
| CVE-2025-58754 | HIGH | DoS via unbounded response data size | 1.12.0 |
| CVE-2026-25639 | HIGH | DoS via `__proto__` key in `mergeConfig` | 1.13.5 |
| CVE-2026-42033 | HIGH | Prototype pollution gadgets enabling response tampering / data exfiltration / request hijacking | 1.15.1 |
| CVE-2026-42264 | HIGH | Prototype pollution read-side gadgets in HTTP adapter — credential injection / request hijacking | 1.15.2 |
| CVE-2026-44494 | HIGH | Full MITM via prototype pollution gadget in `config.proxy` | 1.16.0 |
| CVE-2026-44495 | HIGH | Credential theft / response hijacking via prototype pollution gadget in config merge | 1.15.2 |
| CVE-2026-44496 | HIGH | ReDoS via cookie name injection | 1.16.0 |
| CVE-2026-44486 / 44487 / 44492 | HIGH | Proxy-Authorization header leak variants across redirect/direct-connection edge cases (44492 is an incomplete fix of CVE-2025-62718) | 1.16.0 |
| CVE-2026-42035 (GHSA-6chq-wfr3-2hj9) | HIGH | Header injection via prototype pollution | 1.15.1 |
| CVE-2025-62718 / CVE-2026-42038 / CVE-2026-42043 | MODERATE | NO_PROXY bypass family (hostname normalization, IP alias, loopback subnet) leading to SSRF — each is an incomplete fix of the previous | 1.15.0 / 1.15.1 / 1.15.1 |
| CVE-2026-42034 / 42036 / 42039 | MODERATE | Streamed upload/response size-limit bypasses (`maxBodyLength`, `maxContentLength`), unbounded recursion DoS in `toFormData` | 1.15.1 |
| CVE-2026-42037 / 42041 / 42042 / 42044 / 44490 | MODERATE | Further prototype-pollution-driven CRLF injection, auth bypass, XSRF token leakage, response tampering, DoS variants | 1.15.1–1.16.0 |
| CVE-2026-40175 | MODERATE | Unrestricted cloud metadata exfiltration via header injection chain | 1.15.0 |
| CVE-2026-42040 | LOW | Null byte injection via reverse-encoding in `AxiosURLSearchParams` | 1.15.1 |

Full advisory list with IDs/ranges is in `osv-scan-pinned-versions.json` alongside this report.
**Breaking changes:** No hard API breaks for typical usage (`1.x` semver held), but note one behavioral change during the range: `1.7.4` tightened relative-URL handling in Node so a request with no scheme/host now throws `Invalid URL` instead of silently defaulting to `localhost` — if the service relies on that old fallback, it will need an explicit `baseURL`. `1.15.x` also introduced `allowAbsoluteUrls` and null-prototype merged config/headers as part of the SSRF fixes.
**Migration steps:** Version bump `1.6.0` -> `1.18.1`. Given the URL-handling and config-merge behavior changes noted above, smoke-test any code relying on implicit relative-URL resolution or absolute-URL override of `baseURL`.
**Security advisories:** 26 confirmed via live OSV.dev query against the exact pinned version (table above is the high/critical-relevant subset; full list in the JSON artifact). None of these require a specific opt-in proxy config to matter — several (SSRF via absolute URL, DoS via response size, prototype pollution response tampering) apply to default/common axios usage.
**Recommendation:** Do not ship on `1.6.0` under any circumstances — this is 26 known advisories deep, several HIGH severity and directly exploitable in default configurations (SSRF, prototype pollution, DoS). Move to `1.18.1`.
**Your call:** Bump to `1.18.1` (recommended, clears everything) — if you need a more conservative jump, `1.16.0` clears all the HIGH-severity items but leaves nothing meaningfully safer than going straight to latest.

## 2. BREAKING-UPGRADE

### path-to-regexp: 6.3.0 -> 8.4.2 (decision, not a security requirement)

**Risk level:** BREAKING-UPGRADE
**Verified via:** `scripts/osv_scan.py npm:path-to-regexp@6.3.0` (OSV.dev, live) — `[CLEAN]`, no advisories against the pinned version; `https://registry.npmjs.org/path-to-regexp/latest` (current latest `8.4.2`); `https://api.github.com/repos/pillarjs/path-to-regexp/releases` (full release history — `6.3.0` published Sept 12, 2024 is the **last** release on the 6.x line; the project's active branch is 8.x, most recently `8.4.2` on April 1, 2026); WebSearch "path-to-regexp v6 to v8 migration guide breaking changes" and "path-to-regexp 6.x maintenance status deprecated express 4" for migration-guide and maintenance-status context.
**What changed:** Your pin is **not** vulnerable — OSV shows no advisories for `6.3.0` (it's actually the version that fixed the last known ReDoS-class issue on that line). But the project has not released anything on the 6.x branch since Sept 2024; all active development, including three releases in 2026 alone, is on the 8.x line, which is a deliberate breaking rewrite:

- Bare `*` wildcards are no longer valid — they must be named, e.g. `/api*` -> `/api{*path}` or `/api(.*)`.
- The `?` optional-segment suffix is removed in favor of brace groups, e.g. `/:file?` -> `/:file{.:ext}`.
- Raw RegExp-style route paths are no longer supported.
- Characters `()[]?+!` are now reserved and can throw if used incidentally.

This has broken real consumers on upgrade (Express 5 / NestJS 11 `setGlobalPrefix` / Microsoft Teams SDK middleware are documented examples), so this is not a low-effort bump.
**Breaking changes:** Yes, substantial — see above. Every route-pattern string using bare wildcards, `?` optionals, or a RegExp path needs to be rewritten and route-matching behavior re-tested.
**Migration steps:** Not a version bump — treat as a scoped migration: (1) inventory every route pattern using `*`, `?`, or RegExp paths, (2) rewrite per the v8 syntax rules above, (3) add route-matching tests before/after, since these are silent behavior changes, not just thrown errors, in some cases.
**Security advisories:** None found for `6.3.0` via live OSV scan. Not a security-driven upgrade.
**Recommendation:** Ship `6.3.0` for the immediate lock — it is not vulnerable today. But put the v8 migration on the roadmap deliberately rather than by default: the 6.x line is no longer receiving any release at all (feature or otherwise) while 8.x gets active attention, so if a future advisory does target the 6.x branch there is no recent precedent here for a backport (unlike, e.g., the project's own legacy `0.1.x` line, which the maintainers are still patching — most recently `0.1.13` in March 2026 — so backport policy is inconsistent across their own older branches and shouldn't be assumed for 6.x).
**Your call:** Ship as pinned now; schedule the v8 rewrite as its own tracked migration rather than bundling it into this dependency-lock pass.

## 3. Already current (no decision needed)

### cross-spawn: 7.0.6

**Verified via:** `scripts/osv_scan.py npm:cross-spawn@7.0.6` (OSV.dev, live) — `[CLEAN]`; `scripts/osv_scan.py npm:cross-spawn` with no version filter (OSV.dev, live) — confirms the package's only advisory, `GHSA-3xgq-45jj-v275` / CVE-2024-21538 (ReDoS, HIGH), affects `7.0.0` up to a fix at `7.0.5` (and separately `<6.0.6`), so `7.0.6` is past the fix; `https://registry.npmjs.org/cross-spawn/latest` confirms `7.0.6` **is** the current latest; `https://api.github.com/repos/moxystudio/node-cross-spawn/tags` confirms no newer tag exists.
Pinned version is both current and past the only known advisory's fix point. Safe to ship as-is, no action needed.


## Verification Log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| lodash@4.17.21 has known advisories | Bash (osv_scan.py) | OSV.dev querybatch, `npm:lodash@4.17.21` | 3 advisories: CVE-2025-13465, CVE-2026-2950, CVE-2026-4800 |
| lodash current latest | WebFetch | `registry.npmjs.org/lodash/latest` | `4.18.1` |
| lodash tag history | WebFetch | `api.github.com/repos/lodash/lodash/tags` | `4.18.1`, `4.18.0`, `4.17.23`, `4.17.21`, ... confirmed present |
| lodash@4.18.1 is clean | Bash (osv_scan.py) | OSV.dev querybatch, `npm:lodash@4.18.1` | `[CLEAN]` |
| lodash 4.18.0 release context / CVE narrative | WebSearch | "lodash 4.18.0 release date changelog CVE-2026-4800 CVE-2026-2950" | 4.18.0 released ~Mar 31, 2026; fixes both CVEs; NVD/GHSA/IBM bulletins corroborate |
| axios@1.6.0 has known advisories | Bash (osv_scan.py) | OSV.dev querybatch, `npm:axios@1.6.0` | 26 advisories, version-matched by OSV automatically (npm ecosystem) |
| axios current latest | WebFetch | `registry.npmjs.org/axios/latest` | `1.18.1` |
| axios latest release date | WebFetch | `api.github.com/repos/axios/axios/releases/latest` | `v1.18.1`, published June 21, 2026 |
| axios@1.18.1 is clean | Bash (osv_scan.py) | OSV.dev querybatch, `npm:axios@1.18.1` | `[CLEAN]` |
| axios behavior changes across 1.7–1.10 | WebSearch | "axios changelog 1.7 1.8 1.9 1.10 breaking changes minimum node version" | 1.7.4 tightened relative-URL handling (throws instead of localhost fallback); 1.8.2 fixed CVE-2025-27152; no Node minimum-version change found in that range |
| cross-spawn@7.0.6 has no advisories for this version | Bash (osv_scan.py) | OSV.dev querybatch, `npm:cross-spawn@7.0.6` | `[CLEAN]` |
| cross-spawn's only advisory and its fixed range | Bash (osv_scan.py) | OSV.dev querybatch, `npm:cross-spawn` (no version) | GHSA-3xgq-45jj-v275 / CVE-2024-21538, HIGH, fixed at `7.0.5` (and `6.0.6` on the 6.x line) |
| cross-spawn current latest | WebFetch | `registry.npmjs.org/cross-spawn/latest` | `7.0.6` — matches the pin, nothing newer |
| cross-spawn tag history | WebFetch | `api.github.com/repos/moxystudio/node-cross-spawn/tags` | `v7.0.6` is the newest tag |
| path-to-regexp@6.3.0 has no advisories | Bash (osv_scan.py) | OSV.dev querybatch, `npm:path-to-regexp@6.3.0` | `[CLEAN]` |
| path-to-regexp current latest / release cadence | WebFetch | `registry.npmjs.org/path-to-regexp/latest`; `api.github.com/repos/pillarjs/path-to-regexp/releases` | Latest `8.4.2` (Apr 1, 2026); `6.3.0` (Sept 12, 2024) is the last 6.x release; `0.1.x` line still receives backports (`0.1.13`, Mar 26, 2026) |
| path-to-regexp@8.4.2 is clean | Bash (osv_scan.py) | OSV.dev querybatch, `npm:path-to-regexp@8.4.2` | `[CLEAN]` |
| path-to-regexp v6->v8 breaking changes | WebSearch | "path-to-regexp v6 to v8 migration guide breaking changes" | Bare `*` wildcards, `?` optional syntax, and RegExp paths all removed/changed; documented breakage in Express 5, NestJS 11, Teams SDK |

## Self-check

- Every version sourced from a live lookup? Yes — every pinned and recommended version was confirmed via `osv_scan.py` (OSV.dev), `registry.npmjs.org`, or `api.github.com`, not from memory.
- Both releases AND tags checked? Yes for all four packages via `/tags` (all four) and `/releases/latest` (axios). Tags and releases agreed for the packages checked; no divergence found in this batch.
- Every dependency covered by the OSV scan? Yes — all four covered by a single batched `osv_scan.py` call for the pinned versions, plus follow-up calls for the two vulnerable packages' recommended target versions and cross-spawn's full advisory history (no WebSearch fallback needed — OSV.dev was reachable throughout).
- Changelogs read for every upgrade? Yes for lodash (CVE fix narrative) and axios (behavior-change narrative across the version range) via WebSearch. path-to-regexp is not being recommended for an immediate version bump, but its v6->v8 breaking-change surface was researched via WebSearch since it's the basis for the BREAKING-UPGRADE decision.
- SHA fetched for every GitHub Action reference? N/A — no GitHub Actions in this inventory (npm packages only).
- Internal consistency: no conflicting statements about the same dependency across this report.
- False contemporaneity claims: none present in the input — the task did not describe any of these pins as "latest" or "current," so no CORRECTION finding applies here. (Note for the requester: if any downstream document describes `lodash@4.17.21` or `axios@1.6.0` as "current"/"latest stable," that description is now false per the findings above and would need its own CORRECTION entry in that document.)
- Advisory integrity: every CVE/GHSA ID, affected range, and fixed-in version cited above traces to a specific `osv_scan.py` invocation in this session (see Verification Log) or to the OSV vulnerability detail hydrated by that script — none reconstructed from memory. The one exception is CVE-2024-39338's fixed-in version and a small number of narrative/context details (e.g. exact lodash 4.18.0 release date, axios 1.7.4 URL-handling behavior) which come from WebSearch results rather than a direct OSV or registry fetch; these are marked as WebSearch-sourced in the Verification Log rather than presented as OSV findings.
