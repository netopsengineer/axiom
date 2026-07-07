# Biome Upgrade Review: 2.4.4 -> 2.5.2

## Step 1: Inventory

- `@biomejs/biome` — pinned via `biome.json` `$schema` at
  `https://biomejs.dev/schemas/2.4.4/schema.json` -> current project version
  **2.4.4**.
- `biome.json` config surface in use (from
  `dev/axiom-versioning/dependency-versions-workspace/iteration-5/inputs/biome.json`):
  - `vcs.enabled: true`, `clientKind: "git"`, `useIgnoreFile: true`
  - `files.ignoreUnknown: false`
  - `formatter.enabled: true`, `indentStyle: "space"`, `indentWidth: 2`, `lineWidth: 100`
  - `linter.enabled: true`, `rules.recommended: true`
  - `javascript.formatter.quoteStyle: "double"`, `semicolons: "always"`
  - `json.formatter.enabled: true`
  - `assist.actions.source.organizeImports: "on"`
- `.pre-commit-config.yaml` — the local `biome` hook runs `npm run lint:fix`
  (`entry: npm run lint:fix`, scoped to `\.(js|mjs)$`), and per its own comment
  "reuses the Biome version pinned in `package.json` (one source of truth,
  Dependabot-tracked)". It is **not** a hosted `biomejs/pre-commit` mirror
  hook, so there is no separate pre-commit-hook version to bump — whatever
  version you choose must be bumped in `package.json` (not shown in the
  provided inputs).
- Other pre-commit deps in the same file (gitleaks v8.30.1, actionlint
  v1.7.12, shellcheck-py v0.11.0.1, markdownlint-cli2 v0.22.1, zizmor v1.25.2)
  are out of scope — the task asked specifically about Biome — and are not
  assessed here.

## Step 2: Verify current state

**GitHub API** (`api.github.com/repos/biomejs/biome/releases/latest`, checked
directly via curl, not through an AI-summarized fetch — see note below):

- `tag_name`: `@biomejs/biome@2.5.2`
- `name`: `Biome CLI v2.5.2`
- `published_at`: `2026-07-01T10:32:44Z`

**GitHub tags**, cross-checked via `git/matching-refs/tags/@biomejs/biome@`
(60 matching refs returned; newest is `@biomejs/biome@2.5.2`, no tag beyond
it exists) — releases and tags agree, no divergence here.

**npm registry** (`registry.npmjs.org/@biomejs/biome`):

- `dist-tags.latest`: `2.5.2`
- Published: `2026-07-01T10:30:58.351Z`
- Recent publish cadence (from registry `time` data): 2.4.10 (Mar 30) ->
  2.4.11 (Apr 9) -> 2.4.12 (Apr 14) -> 2.4.13 (Apr 23) -> 2.4.14 (May 1) ->
  2.4.15 (May 9) -> 2.4.16 (May 27) -> 2.5.0 (Jun 12) -> 2.5.1 (Jun 23) ->
  2.5.2 (Jul 1). This is an actively maintained project releasing roughly
  every 1-2 weeks; no maintenance-health concern.

All three sources agree: **latest is 2.5.2**, published 5 days before today
(2026-07-06).

**Note on tooling reliability during this research:** the `WebFetch` tool's
AI-summarization step introduced factual errors when reading GitHub API JSON
and rendered dates (e.g. it reported release dates as "July 1, 2024" and
initially misidentified `@biomejs/biome@` tags as `cli/vX.X.X` legacy tags
from a different package in the monorepo). I switched to raw `curl` + `python3
json.load` for all GitHub API and npm registry calls to get unmangled data,
and cross-checked one WebFetch-derived claim (see CORRECTION below) against
the raw HTML source directly.

## Step 3: Assess the delta (2.4.4 -> 2.5.2)

### a. Changelog read

Full CLI changelog fetched from
`raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md`
(the root `CHANGELOG.md` is a symlink to this path). Read every entry between
the `## 2.4.4` and `## 2.5.2` headers (all of 2.4.5 through 2.4.16, 2.5.0,
2.5.1, 2.5.2). No `### Major Changes` section exists anywhere in this range —
only one `### Minor Changes` section (2.5.0) and `### Patch Changes` for
every other version. This is a minor+patch delta, not a major one.

Key items relevant to this project's `biome.json`:

1. **`linter.rules.recommended` deprecated in favor of `linter.rules.preset`**
   (2.5.0). Confirmed directly from the Biome v2.5 blog post raw HTML text
   (not the AI-summarized version, which is why this is called out as
   independently verified — see Verification Log):

   > "We added the `linter.rules.preset` option... As a result, the option
   > `recommended` has been deprecated. Run `biome migrate --write` to update
   > the configuration."

   The project's `biome.json` uses `"linter": {"rules": {"recommended": true}}`
   — this directly hits the deprecation. It still works in 2.5.2 (deprecated,
   not removed), but should be migrated.

2. **73 nursery rules promoted to stable groups** (2.5.0, PR #10562), many
   marked `(recommended)`. Because this project sets `rules.recommended:
   true`, newly-promoted recommended rules become active immediately on
   upgrade — no opt-in needed. Most of the promoted set is HTML/Vue/Astro/
   Svelte/Next.js/Turborepo-domain (`useVueValidVBind`, `noVueVIfWithVFor`,
   `noUndeclaredEnvVars` Turborepo domain, `useInlineScriptId` Next.js domain,
   etc.) which likely won't fire in a plain Node.js/`.mjs` automation repo
   like this one, but several are general-purpose and could fire on any JS:
   `noProto` (suspicious, recommended), `noDuplicateVariableNames`,
   `noDuplicateEnumValueNames`, `noDuplicateEnumValues`, `noScriptUrl`
   (security, recommended), `useLoneAnonymousOperation`. This is exactly the
   kind of change Biome's own versioning policy documents as expected in a
   minor release (see 3e below) — not a bug, but it can make `npm run
   lint:fix` (and therefore the `biome` pre-commit hook and the "JavaScript
   lint" CI job) fail on files that previously passed.
3. **Four rules renamed** as part of that same promotion (PR #10562):
   `noFloatingClasses` -> `noUnusedInstantiation`, `noMultiStr` ->
   `noMultilineString`, `useFind` -> `useArrayFind`, `useSpread` ->
   `useSpreadOverApply`. This project's `biome.json` does not reference any
   rule by name (only the blanket `recommended: true`), so this specific
   rename list does not require action here — but flag it if any inline
   `// biome-ignore` comments or CI scripts reference the old names.
4. **JSON schema DX improvement** (2.5.1, PR #10615) — no functional change,
   editor-only.
5. Everything else in the 2.4.5-2.4.16 and 2.5.2 ranges is bug fixes
   (formatter edge cases for CSS/Svelte/Vue, LSP fixes, reporter output
   fixes) that do not touch this project's config surface
   (`vcs`/`files`/`formatter`/`json.formatter`/`javascript.formatter`/
   `assist.actions.source.organizeImports`).

### b. Migration path

Direct jump 2.4.4 -> 2.5.2 is supported; no intermediate version required.
Concrete steps:

1. Bump the Biome devDependency to `2.5.2` in `package.json` (source of truth
   per the `.pre-commit-config.yaml` comment) and update the lockfile.
2. Update `biome.json`'s `$schema` to
   `https://biomejs.dev/schemas/2.5.2/schema.json` (confirmed reachable,
   HTTP 200).
3. Run `biome migrate --write` to convert `"rules": {"recommended": true}` to
   `"rules": {"preset": "recommended"}` automatically (this is literally the
   documented purpose of the command: "Updates the configuration when there
   are breaking changes").
4. Run `npm run lint:fix` (the same command the pre-commit hook and CI
   "JavaScript lint" job use) locally against the full repo and review any
   new violations surfaced by the 73 promoted rules before merging, since
   `rules.recommended: true` (soon `preset: "recommended"`) picks up all of
   them automatically.
5. No other config keys in this `biome.json` are affected.

### c. Security

**OSV scan** (`scripts/osv_scan.py`, single call, both project and target
version checked):

```text
[CLEAN]      npm:@biomejs/biome@2.4.4
[CLEAN]      npm:@biomejs/biome@2.5.2
RESULT: 0 of 1 package(s) have advisories in OSV.dev.
```

(raw output also saved to `osv_scan_output.txt` alongside this report)

**Fallback WebSearch** (`"@biomejs/biome" OR "biomejs/biome" CVE security
advisory 2025 2026`): no CVE/GHSA specific to the `@biomejs/biome` npm
package. One search result mentioned a repo commit referencing "fixes an
internal CVE" tied to bumping a `vite` dependency to `v7.3.5`. I checked the
full CLI changelog text between 2.4.4 and 2.5.2 for any mention of `vite` or
"internal CVE" and found none — this appears to be an internal/dev-tooling
dependency bump inside the biome monorepo (e.g., their docs site build), not
something shipped in the `@biomejs/biome` npm package end users install, and
not reflected in the published CLI changelog. I'm not including it as a
finding because I could not trace it to a specific advisory ID or confirm it
affects the published package — flagging it here only for transparency about
what was checked and ruled out.

**GitHub Security Advisories** (`api.github.com/repos/biomejs/biome/security-advisories`):
0 advisories returned.

**Conclusion: no security advisories found via OSV scan, GitHub Security
Advisories API, or WebSearch for either 2.4.4 or 2.5.2.**

### d. Maintenance health

Actively maintained — 10 releases in the ~3 months before "today"
(2026-07-06), most recent 5 days ago. No concern.

### e. Temporal factors

Biome does not publish an EOL/LTS schedule (it's a CLI tool, not a runtime).
The project's own versioning policy page (`biomejs.dev/internals/versioning/`,
fetched and verified) states, in its own words: adding a new recommended lint
rule, or promoting a nursery rule to a recommended stable rule, is classified
as a **minor** release, not breaking — which is exactly what happened in
2.5.0. The same policy page explicitly recommends **pinning exact versions**
in `package.json` because "even patch releases can result in slightly
different formatting or linting results." I could not verify how the
project's own `package.json` currently pins Biome (not provided in inputs) —
worth confirming it uses an exact version, not a caret/tilde range, given
Biome's own guidance.

### f. Transitive impacts

None. The `.pre-commit-config.yaml`'s `biome` hook is a local hook that shells
out to `npm run lint:fix`; it has no separate version of its own to
coordinate. No other pre-commit hooks in the file reference Biome.

## Step 4: Decision

### @biomejs/biome: 2.4.4 -> 2.5.2

**Risk level:** BREAKING-UPGRADE
**Verified via:** `curl https://api.github.com/repos/biomejs/biome/releases/latest`,
`curl https://api.github.com/repos/biomejs/biome/git/matching-refs/tags/@biomejs/biome@`,
`curl https://registry.npmjs.org/@biomejs/biome` (all Jul 6, 2026), plus full
changelog diff read (`raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md`)
and `biomejs.dev/blog/biome-v2-5/` raw HTML.
**What changed:** Minor+patch delta (no Major Changes section anywhere in the
range). The one config-relevant change is the deprecation of
`linter.rules.recommended` in favor of `linter.rules.preset`, plus 73
nursery-to-stable rule promotions (several `recommended`) that activate
automatically under this project's `rules.recommended: true`.
**Breaking changes:** Not "breaking" under Biome's own semver policy (rule
promotions are explicitly documented as minor-release material), but
practically breaking for CI: newly active recommended rules can fail
`npm run lint:fix` / the pre-commit `biome` hook / the "JavaScript lint" CI
job on files that previously passed. `linter.rules.recommended` also emits a
deprecation path that `biome migrate --write` needs to resolve.
**Migration steps:**

1. Bump `@biomejs/biome` to `2.5.2` in `package.json` + lockfile.
2. Update `biome.json` `$schema` to `.../schemas/2.5.2/schema.json`.
3. Run `biome migrate --write` (converts `recommended: true` ->
   `preset: "recommended"`).
4. Run `npm run lint:fix` across the repo and review/fix any new violations
   from the promoted rules before merging.

**Security advisories:** None found via OSV scan (`osv_scan.py`, both 2.4.4
and 2.5.2 come back `[CLEAN]`), GitHub Security Advisories API (0 results),
and WebSearch ("@biomejs/biome" OR "biomejs/biome" CVE security advisory 2025
2026`).
**Recommendation:** Upgrade. This is routine linter/formatter hygiene with a
known, mechanical migration step (`biome migrate --write`) — the only real
cost is triaging whatever the newly-active recommended rules flag in this
repo's `.mjs` files, which is a one-time, bounded effort.
**Your call:** Upgrade now and run `biome migrate --write` + a full
`npm run lint:fix` pass to see the actual new-violation surface before
merging, or defer and re-run this check closer to the next release?

## Step 5: Prioritized summary

1. **BREAKING-UPGRADE** — `@biomejs/biome` 2.4.4 -> 2.5.2 (above). No
   SECURITY or DEPRECATION-of-the-tool-itself findings exist for Biome
   itself.
2. No CORRECTION findings — the provided `biome.json` and
   `.pre-commit-config.yaml` do not make any false contemporaneity claims
   about Biome's version (they simply pin `2.4.4` via the schema URL without
   asserting it is "current" or "latest").

No timeline question is needed here — this is a review/upgrade-assessment
task on existing config, not a from-scratch implementation, so findings are
presented directly by risk level per the skill's guidance.

## Step 6: Verification Log

| Claim                                                                                 | Tool                                                                   | Source                                                                              | Finding                                                                                                                                                                               |
|---------------------------------------------------------------------------------------|------------------------------------------------------------------------|-------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Latest Biome release is 2.5.2                                                         | Bash curl                                                              | `api.github.com/repos/biomejs/biome/releases/latest`                                | `tag_name: @biomejs/biome@2.5.2`, published 2026-07-01T10:32:44Z                                                                                                                      |
| No newer tag exists beyond the latest release                                         | Bash curl                                                              | `api.github.com/repos/biomejs/biome/git/matching-refs/tags/@biomejs/biome@`         | 60 matching refs, newest is `@biomejs/biome@2.5.2`                                                                                                                                    |
| npm registry agrees                                                                   | Bash curl                                                              | `registry.npmjs.org/@biomejs/biome`                                                 | `dist-tags.latest: 2.5.2`, published 2026-07-01T10:30:58.351Z                                                                                                                         |
| Biome release cadence / maintenance health                                            | Bash curl                                                              | `registry.npmjs.org/@biomejs/biome` (`time` field)                                  | 10 releases in ~3 months, last one 5 days before today                                                                                                                                |
| No Major Changes between 2.4.4 and 2.5.2                                              | Bash grep                                                              | `raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md` | Only one `### Minor Changes` header (2.5.0) in range; rest are `### Patch Changes`; zero `### Major Changes`                                                                          |
| `linter.rules.recommended` is deprecated in 2.5.0                                     | Bash curl (raw HTML, re-verified after WebFetch AI-summary flagged it) | `biomejs.dev/blog/biome-v2-5/`                                                      | Raw text: "the option `recommended` has been deprecated. Run `biome migrate --write`..."                                                                                              |
| 73 nursery rules promoted to stable groups, incl. 4 renames                           | Bash grep                                                              | Biome CLI CHANGELOG.md, `## 2.5.0` section, PR #10562                               | Confirmed list of promotions/renames (`noFloatingClasses`->`noUnusedInstantiation`, `noMultiStr`->`noMultilineString`, `useFind`->`useArrayFind`, `useSpread`->`useSpreadOverApply`)  |
| 2.5.2 JSON schema URL is valid                                                        | Bash curl                                                              | `https://biomejs.dev/schemas/2.5.2/schema.json`                                     | HTTP 200                                                                                                                                                                              |
| No OSV advisories for 2.4.4 or 2.5.2                                                  | `scripts/osv_scan.py`                                                  | OSV.dev batch query                                                                 | Both `[CLEAN]`                                                                                                                                                                        |
| No GitHub Security Advisories for biomejs/biome                                       | Bash curl                                                              | `api.github.com/repos/biomejs/biome/security-advisories`                            | 0 advisories returned                                                                                                                                                                 |
| No CVE/GHSA found via search                                                          | WebSearch                                                              | `"@biomejs/biome" OR "biomejs/biome" CVE security advisory 2025 2026`               | No CVE/GHSA specific to the npm package; one unrelated mention of an internal `vite` dependency bump not reflected in the published CLI changelog, not reported as a finding          |
| Biome's own versioning policy classifies new recommended rules as minor, not breaking | Bash curl (raw HTML via WebFetch tool)                                 | `biomejs.dev/internals/versioning/`                                                 | Confirmed: "Adding a new recommended lint rule or promoting an existing lint rule from the nursery group to a recommended lint rule in a stable group" is listed under minor releases |
| Biome recommends exact-version pinning                                                | WebFetch                                                               | `biomejs.dev/internals/versioning/`                                                 | "even patch releases can result in slightly different formatting or linting results"                                                                                                  |

**Self-check:**

- Every version sourced from a live lookup — yes (curl + npm registry + GitHub API, cross-checked against WebFetch where used).
- Both releases AND tags checked — yes, and they agree (no divergence found for this repo, unlike the `biomejs/pre-commit` example in the skill's reference).
- Every dependency in scope covered by OSV scan or fallback — yes, `@biomejs/biome` covered by both `osv_scan.py` and a WebSearch fallback, plus GitHub Security Advisories API as a third check.
- Changelogs read for the full upgrade, not just version-existence confirmed — yes, every changelog section between 2.4.4 and 2.5.2 was read.
- SHA fetched for GitHub Actions — not applicable, no GitHub Actions in scope for this task.
- Internal consistency — the two input files do not make conflicting claims about the Biome version.
- False contemporaneity claims — none found; neither input file asserts 2.4.4 is "current" or "latest."
- Advisory integrity — no advisories were found, so none are reported; the one internal-CVE search snippet that could not be traced to a specific advisory or confirmed to affect the published package was explicitly excluded rather than reported as a finding.
- Tooling caveat — the `WebFetch` tool's AI-summarization introduced two errors during this research (miscited release years as 2024, and initially mis-scanned tag names); both were caught by cross-checking against raw `curl` output / raw HTML text before being included in this report.
