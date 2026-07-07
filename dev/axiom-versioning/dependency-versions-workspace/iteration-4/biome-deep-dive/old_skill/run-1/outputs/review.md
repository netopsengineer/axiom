# Biome Upgrade Review — 2.4.4 to latest

## Inventory

- `biome.json`: `$schema` pinned to `https://biomejs.dev/schemas/2.4.4/schema.json` — indicates the project is on `@biomejs/biome` 2.4.4. No `package.json` was provided as an input, so the exact npm-installed version cannot be independently cross-checked; the schema URL is the only concrete version signal available and is treated as authoritative for this review.
- `.pre-commit-config.yaml`: the `biome` hook is a **local** hook (`entry: npm run lint:fix`, `language: system`), not the third-party `biomejs/pre-commit` repo. Per the file's own header comment, the Biome version is "pinned in package.json (one source of truth, Dependabot-tracked)." No `biomejs/pre-commit` SHA pin exists anywhere in this file, so that separate wrapper repo is **out of scope** for this review.
- Other pre-commit repos in the file (`markdownlint-cli2` v0.22.1, `gitleaks` v8.30.1, `actionlint` v1.7.12, `shellcheck-py` v0.11.0.1, `zizmor` v1.25.2) are unrelated to Biome and out of scope for this task.

## Findings

### @biomejs/biome: 2.4.4 -> 2.5.2

**Risk level:** DEPRECATION

**Verified via:**

- WebFetch/curl `api.github.com/repos/biomejs/biome/releases/latest` → tag `@biomejs/biome@2.5.2`, published 2026-07-01
- curl `api.github.com/repos/biomejs/biome/tags` (paged, filtered to `@biomejs/biome@` prefix — this is a monorepo with many unrelated sub-package tags) → newest matching tag is also `2.5.2`; releases and tags agree, no divergence this time
- curl `registry.npmjs.org/@biomejs/biome/latest` → `2.5.2`
- Read the full official changelog (`raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md`) for every entry between 2.4.4 and 2.5.2

**What changed:** Patch releases 2.4.5–2.4.16 are bug fixes only. The 2.5.0 minor release: added a new `preset` linter option (`"recommended" | "all" | "none"`) intended to **replace** the boolean `linter.rules.recommended` field; promoted 73 nursery rules to stable groups (several are newly `(recommended)` for plain JS/CSS/JSON projects like this one: `noDuplicateAttributes`, `noDuplicateArgumentNames`, `noDuplicateInputFieldNames`, `noDuplicateVariableNames`, `noDuplicateEnumValueNames`, `useLoneAnonymousOperation`, `noProto`, `noDuplicateEnumValues`, `noDeprecatedMediaType`, `noScriptUrl`, `noAmbiguousAnchorText`); added a `concise` reporter, `--watch` mode, SVG format/lint support, and a `biome upgrade` command. 2.5.1/2.5.2 are bug-fix-only patches.

**Breaking changes:** No schema-breaking changes for this project's exact `biome.json`. This was verified empirically, not just by reading the changelog — `npx @biomejs/biome@2.5.2 check .` and `ci .` were run directly against the project's real `biome.json` file. Both exit with code **0**. The only diagnostics raised are informational/warning level:

1. Info: `$schema` still points at `2.4.4` (cosmetic — CLI notes the mismatch and suggests `biome migrate`).
2. **DEPRECATED** warning: *"The use of the `recommended` field has been deprecated, and will [be] removed in the next major version of Biome. Use `preset` instead."* — this affects `linter.rules.recommended: true` in this project's config directly.

Separately (non-breaking but worth budgeting time for): because this project uses `recommended: true` (a moving target), the 73 newly-promoted rules mentioned above will start running once on 2.5.2 and may surface new lint findings that didn't exist under 2.4.4.

**Migration steps:**

1. Bump `@biomejs/biome` (and any pinned `@biomejs/cli-*` optional platform packages) to `2.5.2` wherever it's declared (likely `package.json`, not provided for direct review here).
2. Update `biome.json`'s `$schema` to `https://biomejs.dev/schemas/2.5.2/schema.json`.
3. For the deprecated `recommended` field, **hand-edit** `"rules": { "recommended": true }` to `"rules": { "preset": "recommended" }` rather than trusting `biome migrate --write` — see the dedicated finding below, this is not optional advice.
4. Run `biome check .` (or `biome ci .`) after the bump and review any new findings surfaced by the newly-promoted recommended rules before merging.

**Security advisories:** None found for the published `@biomejs/biome` npm package via: WebSearch `"biome biomejs CVE 2026 security advisory"`; GitHub Security Advisories API (`api.github.com/repos/biomejs/biome/security-advisories` → 0 results); GitHub Advisories database search (`github.com/advisories?query=biome` → only an unrelated package, `biome-mcp-server`, appears). One "internal CVE" fix did merge upstream (PR biomejs/biome#10690, merged 2026-06-18) — its diff was inspected directly and it only touches `Cargo.lock` and the dev-only `xtask/codegen` Rust crate (a `git2`/`libgit2-sys` version bump, 0.20.4→0.21.0). That crate is a build-time tool for Biome's own codegen and is **not shipped** in the published npm package or CLI binary, so it is not applicable to consumers of `@biomejs/biome`.

**Recommendation:** Upgrade to 2.5.2. It's a same-major-version, non-breaking bump for this config. Do the `recommended`→`preset` edit by hand at the same time (low effort), and review new lint output from newly-promoted recommended rules before merging.

**Your call:** Include in this batch. Decide whether to also proactively rewrite `recommended: true` → `preset: "recommended"` now, or leave the (still fully functional) deprecated field in place until Biome actually removes it in a future major version.

---

### `biome migrate` silently disables all lint rules for this config pattern

**Risk level:** BREAKING-UPGRADE

**Verified via:** Direct reproduction, twice — ran `npx @biomejs/biome@2.5.2 migrate --write` against (a) the project's actual `biome.json` and (b) a minimal isolated `{"linter":{"rules":{"recommended":true}}}` file. Both times, `"rules": { "recommended": true }` was rewritten to `"rules": { "preset": "none" }` — not the correct `"preset": "recommended"`. `"recommended": false` was also tested and produced the identical `"preset": "none"` output, confirming the tool isn't reading the boolean's value at all. Cross-checked against upstream: GitHub issue [biomejs/biome#10716](https://github.com/biomejs/biome/issues/10716) ("biome migrate rewrites `rules.recommended: true` to `preset: "none"` ... silently disabling all rules"), filed 2026-06-20, **currently OPEN**. A community fix (PR #10744) was submitted and went through review, but the maintainer closed it unmerged on 2026-06-24 after flagging the contributor's activity as bot-like ("Ok this is a noisy bot. Closing and banning") — so the fix never shipped. The bug reproduces on 2.5.2, the current latest release.

**What changed:** N/A — this is a currently-unpatched bug in the `biome migrate` command itself.

**Breaking changes:** Yes, in effect, for anyone who follows Biome's own suggested remediation. If this project runs `biome migrate --write` to clear the "recommended is deprecated" warning, the resulting `biome.json` gets `"preset": "none"`, which disables every lint rule — while `biome ci`/`biome check` continue to exit 0, making the regression invisible in CI.

**Migration steps:** Do not run `biome migrate --write` unattended for this config. Either leave `"rules": { "recommended": true }` in place (fully functional today, just deprecated) until #10716 is fixed, or hand-edit directly to `"rules": { "preset": "recommended" }` instead of trusting the migrate tool. If `biome migrate` is ever run for an unrelated reason, diff the resulting `biome.json` before committing and confirm `preset` is not `"none"`.

**Security advisories:** N/A — this is a correctness/tooling bug, not a published CVE/GHSA.

**Recommendation:** Treat `biome migrate` as unsafe for this specific field until biomejs/biome#10716 lands a real fix. Make the `recommended` → `preset` edit by hand — it's a one-line change and carries zero risk of the migrate tool's failure mode.

**Your call:** Hand-edit `biome.json` now, or leave `recommended: true` as-is until Biome ships an actual fix — either is safe; running `migrate --write` on the `linter.rules` block today is the only unsafe option.

---

## Verification Log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| Latest `@biomejs/biome` release | Bash curl (GitHub API) | `api.github.com/repos/biomejs/biome/releases/latest` | 2.5.2, published 2026-07-01 |
| Latest `@biomejs/biome` tag matches release | Bash curl (GitHub API, 3 pages) | `api.github.com/repos/biomejs/biome/tags` filtered to `@biomejs/biome@` prefix | Newest tag = `@biomejs/biome@2.5.2`; matches releases/latest, no divergence |
| Latest npm published version | Bash curl | `registry.npmjs.org/@biomejs/biome/latest` | 2.5.2 |
| 2.5.2 JSON schema exists/loads | Bash curl | `biomejs.dev/schemas/2.5.2/schema.json` | HTTP 200 |
| Changelog 2.4.5 → 2.5.2 content | Bash curl (raw GitHub) | `raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md` | Read every entry; no schema-breaking changes for this project's config keys |
| `recommended` field still present (not removed) in 2.5.2 schema | Bash (downloaded + parsed JSON schema) | `biomejs.dev/schemas/2.5.2/schema.json` | Field present; description doesn't flag removal in-schema (deprecation is CLI-diagnostic-level, confirmed separately below) |
| Project's exact `biome.json` is functionally compatible with 2.5.2 CLI | Bash (live execution) | `npx @biomejs/biome@2.5.2 check .` and `ci .` run against the project's real `biome.json` | Exit code 0 both times; only info/deprecation-level diagnostics, no errors |
| `biome migrate --write` output for `recommended: true`/`false` | Bash (live execution, 2 reproductions) | `npx @biomejs/biome@2.5.2 migrate --write` on project's `biome.json` and an isolated minimal repro | Both incorrectly produce `"preset": "none"` instead of `"preset": "recommended"` |
| Migrate bug is known/tracked upstream, still open | Bash curl (GitHub API) | `api.github.com/repos/biomejs/biome/issues/10716` + comments; PR #10744 | Issue open since 2026-06-20; community fix PR closed unmerged 2026-06-24 |
| No published CVE/advisory for `@biomejs/biome` | WebSearch + Bash curl (GitHub API) | `"biome biomejs CVE 2026 security advisory"`; `api.github.com/repos/biomejs/biome/security-advisories`; `github.com/advisories?query=biome` | No advisories found for `@biomejs/biome`; only unrelated `biome-mcp-server` package surfaces |
| "Internal CVE" PR #10690 scope/applicability | Bash curl (GitHub API + raw diff) | `api.github.com/repos/biomejs/biome/pulls/10690`; `github.com/biomejs/biome/pull/10690.diff` | Merged 2026-06-18; touches only `Cargo.lock` + dev-only `xtask/codegen` (`git2`/`libgit2-sys` bump); not shipped in the npm package |
| 73 nursery rules promoted to stable in 2.5.0, some newly `(recommended)` | Bash curl (raw changelog), `## 2.5.0` section | same changelog file as above | Confirmed specific list of newly-recommended rules relevant to a plain JS/CSS/JSON project |
| `.pre-commit-config.yaml`'s `biome` hook is local, not the `biomejs/pre-commit` repo | Read (provided file) | `.pre-commit-config.yaml` | Confirmed `entry: npm run lint:fix`, `language: system`; no `biomejs/pre-commit` repo entry present anywhere in the file |

**Self-check:**

- Every version claim sourced from a live lookup — yes; the compatibility claim went further than a version lookup and was verified by actually executing the target CLI version against the real config.
- Both releases and tags checked — yes, no divergence found this time (unlike the `biomejs/pre-commit` example in the skill's reference material, which is a different, out-of-scope repo).
- Security search performed — yes, three independent methods, all negative; one adjacent "internal CVE" mention was chased down and found inapplicable to consumers.
- Changelog read for the full upgrade span, not just version-existence — yes, all entries 2.4.5–2.5.2.
- SHA pinning — not applicable; Biome here is an npm dependency and local pre-commit hook, not a GitHub Action or SHA-pinned artifact.
- False contemporaneity claims — none found. Neither `biome.json` nor `.pre-commit-config.yaml` asserts the pinned Biome version is "current," "latest," or "verified," so there are no CORRECTION-level findings to raise for this task.
