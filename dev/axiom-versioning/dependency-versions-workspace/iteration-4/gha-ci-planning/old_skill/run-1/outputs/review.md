# CI Plan: Pre-commit Hooks, Markdownlint, and cspell on PRs

## Task

Plan a GitHub Actions workflow for the `axiom` repository that runs the
project's pre-commit hooks on pull requests, plus markdownlint and cspell,
using best practices for action pinning (SHA pinning, not mutable tags).

## Inputs reviewed

- `.pre-commit-config.yaml` (iteration-5 inputs copy) — defines local
  npm-script hooks plus five third-party hook repos: `DavidAnson/markdownlint-cli2`,
  `gitleaks/gitleaks`, `rhysd/actionlint`, `shellcheck-py/shellcheck-py`,
  `zizmorcore/zizmor-pre-commit`. All third-party hooks are already
  commit-SHA pinned with a `# frozen: vX.Y.Z` comment.
- `biome.json` (iteration-5 inputs copy) — reviewed but out of scope for this
  task; it has no bearing on the CI workflow being planned.
- Repo context also inspected to fit an implementation to how this repo
  already runs CI: root `package.json`, `.github/workflows/validate.yml`,
  `.github/actions/validate-plugins/`.

## Step 1: Inventory

**GitHub Actions the new workflow needs (SHA pinning required):**

| Action | Role |
|---|---|
| `actions/checkout` | check out the PR |
| `actions/setup-node` | Node runtime for `npm ci` / `npx prek` |
| `actions/cache` | cache prek's hook-environment cache across runs |

**Pre-commit hook repos referenced by `.pre-commit-config.yaml`** (already
commit-pinned in the input file; each re-verified for currency below):
`DavidAnson/markdownlint-cli2`, `gitleaks/gitleaks`, `rhysd/actionlint`,
`shellcheck-py/shellcheck-py`, `zizmorcore/zizmor-pre-commit`.

**Tooling versions:**

- `prek` — the pre-commit-compatible runner (`@j178/prek` npm devDependency,
  `^0.4.8`, already invoked via `npm run check:precommit:security` today).
- `cspell` — npm devDependency `^10.0.1`, invoked via `npm run lint:spelling`,
  which is itself one of the local hooks in `.pre-commit-config.yaml`.
- `j178/prek-action` — an alternative, dedicated GitHub Action for running
  `prek` in CI (discovered during verification, see Design Decision below).

markdownlint and cspell are **not separate concerns** from "run the
pre-commit hooks" here: `.pre-commit-config.yaml` already defines a
`markdownlint-cli2` hook and a `spelling` hook (which shells out to
`cspell`). Running the full hook suite via `prek run --all-files`
inherently satisfies "markdownlint and cspell in CI" — no separate job is
needed for either.

## Step 2–3: Verification and delta assessment

### actions/checkout: v7.0.0 (current, no change)

**Verified via:** `gh api repos/actions/checkout/releases/latest` (published
2026-06-18) and `/tags` — both agree on `v7.0.0`.
**SHA:** `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` (direct commit object, no
annotated-tag resolution needed). Matches the pin already used everywhere in
this repo's other workflows.
**Security advisories:** None found via WebSearch specific to a defect in
`actions/checkout` itself. The June 18, 2026 v7.0.0 release does hardens
default behavior against "pwn request" checkouts under `pull_request_target`
(the pattern behind CVE-2025-61671, a real Microsoft-repo incident) — not
relevant here since this plan uses the `pull_request` trigger, not
`pull_request_target`, and none of these jobs need write access or secrets.

### actions/setup-node: v6.4.0 (current, no change)

**Verified via:** `gh api repos/actions/setup-node/releases/latest`
(published 2026-04-20) and `/tags` — both agree. **SHA:**
`48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` (direct commit object). Matches
the existing pin used in this repo's other workflows.
**Security advisories:** None found via WebSearch.

### actions/cache: v6.1.0 (new to this repo — not previously pinned anywhere)

**Verified via:** `gh api repos/actions/cache/releases/latest` (published
2026-06-26) and `/tags` — both agree on `v6.1.0` (training data would likely
suggest v3/v4; v6 is a training-data trap, confirmed live).
**SHA:** `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` (direct commit object).
**Security advisories:** None found via WebSearch for `actions/cache`
itself. General 2026 GHA guidance (multiple sources) reinforces SHA-pinning
every action including `cache`, and scoping cache keys so PR and release
workflows don't share a cache namespace — this plan's cache key already
scopes by `hashFiles('.pre-commit-config.yaml')`.

### DavidAnson/markdownlint-cli2-action: v24.0.0 (current, no change)

**Verified via:** `gh api repos/DavidAnson/markdownlint-cli2-action/releases/latest`
(published 2026-07-03) and `/tags` — both agree. Not used directly in the
new workflow (the `markdownlint-cli2` **pre-commit hook**, a different repo
with independent versioning, covers markdownlint under `prek`), but
confirmed current since `validate.yml` already runs it separately.
**SHA:** `8de2aa07cae85fd17c0b35642db70cf5495f1d25` — matches the existing
pin in `validate.yml` exactly.

### DavidAnson/markdownlint-cli2 (pre-commit hook repo): v0.22.1 -> v0.23.0

**Risk level:** ROUTINE
**Verified via:** `gh api repos/DavidAnson/markdownlint-cli2/releases/latest`
returns HTTP 404 — this repo publishes no formal GitHub Releases (confirms
the input file's own comment that "this project ships NO GitHub releases").
`/tags` shows `v0.23.0` as newest, ahead of the frozen `v0.22.1`.
**What changed:** Diffed the tag range via `compare/v0.22.1...v0.23.0`.
Nearly every commit is a Dependabot bump to the project's own internal
build/test tooling (ajv, eslint, cpy, ava, eslint-plugin-n, playwright,
js-yaml). The one user-facing change: a new `overrides` property for
CLI2-style config files (additive).
**Breaking changes:** No — this repo's `.markdownlint-cli2.jsonc` doesn't
use anything removed, and `overrides` is opt-in.
**Migration steps:** `prek auto-update --freeze` (per the input file's own
maintenance instructions), or manually: `rev: 534166213006ec869b773b7ed8c6ebeaad1165d0 # frozen: v0.23.0`.
**Security advisories:** None found via WebSearch "markdownlint-cli2 CVE
security advisory 2026".
**Recommendation:** Take it — zero risk.
**Your call:** Include in the same PR as this new workflow, or batch into a
separate routine dependency-bump PR.

### zizmorcore/zizmor-pre-commit: v1.25.2 -> v1.26.1

**Risk level:** ROUTINE (worth prioritizing since it's a security scanner)
**Verified via:** `gh api repos/zizmorcore/zizmor-pre-commit/releases/latest`
(published 2026-06-21, tag `v1.26.1`) and `/tags` — both agree. This
pre-commit repo is a thin mirror; the underlying tool's own changelog was
read at `repos/zizmorcore/zizmor/releases/tags/v1.26.0` and `.../v1.26.1`.
**What changed:** v1.26.0 adds three new audits — `typosquat-uses` (detects
typo-squatted `uses:` action references — directly relevant to a repo that
SHA-pins dozens of third-party actions), `unsound-ternary`, and
`adhoc-packages` — plus makes `known-vulnerable-actions` configurable and
speeds up online audits. v1.26.1 is "a small corrective release" for 1.26.0
per its release notes.
**Breaking changes:** No — new audits only add findings; nothing in this
repo's reviewed workflow content should trip them, though the actual
`prek run --all-files` execution is the authoritative check.
**Migration steps:** `prek auto-update --freeze`, or manually:
`rev: e3eebf65325ccc992422292cb7a4baee967cf815 # frozen: v1.26.1`.
**Security advisories:** None found via WebSearch "zizmor CVE security
advisory 2026" — zizmor is the scanner, not a scanned target.
**Recommendation:** Take this update — `typosquat-uses` is a directly useful
new detection for this repo's pinning-heavy workflows.
**Your call:** Bump now, or batch with the markdownlint-cli2 bump above.

### gitleaks/gitleaks, rhysd/actionlint, shellcheck-py/shellcheck-py: current, no change

- **gitleaks/gitleaks v8.30.1** — `releases/latest` (published 2026-03-21)
  and `/tags` agree; matches the frozen pin exactly. Also matches
  `validate.yml`'s separate `GITLEAKS_VERSION: 8.30.1` env var — internally
  consistent.
- **rhysd/actionlint v1.7.12** — `releases/latest` (published 2026-03-30)
  and `/tags` agree; matches the frozen pin exactly.
- **shellcheck-py/shellcheck-py v0.11.0.1** — `releases/latest` returns 404
  (no GitHub Releases ever published; tags only). `/tags` top entry is
  `v0.11.0.1`, matching the frozen pin exactly.

All three frozen SHAs (plus the two above with deltas) were cross-checked
against `git/refs/tags/{tag}` for internal consistency — every SHA in the
input file genuinely corresponds to the tag in its adjacent comment:

| Hook | Frozen SHA in file | Live SHA for that tag | Match |
|---|---|---|---|
| gitleaks v8.30.1 | `83d9cd684c87d95d656c1458ef04895a7f1cbd8e` | `83d9cd684c87d95d656c1458ef04895a7f1cbd8e` | Yes |
| actionlint v1.7.12 | `914e7df21a07ef503a81201c76d2b11c789d3fca` | `914e7df21a07ef503a81201c76d2b11c789d3fca` | Yes |
| shellcheck-py v0.11.0.1 | `745eface02aef23e168a8afb6b5737818efbea95` | `745eface02aef23e168a8afb6b5737818efbea95` | Yes |
| markdownlint-cli2 v0.22.1 | `996abf60411a8d954288ac9856aae7602b80cbda` | `996abf60411a8d954288ac9856aae7602b80cbda` | Yes |
| zizmor-pre-commit v1.25.2 | `9257c6050c0261b8c57e712f632dc4a8010109a9` | `9257c6050c0261b8c57e712f632dc4a8010109a9` | Yes |

**Security advisories:** none found for gitleaks, actionlint, or shellcheck
via targeted WebSearches.

### @j178/prek (npm): v0.4.8 (current, no change)

**Verified via:** `registry.npmjs.org/@j178/prek/latest` → `0.4.8`, matching
`package.json`'s `^0.4.8`. Cross-checked against
`gh api repos/j178/prek/releases/latest` (published 2026-07-04) and `/tags`
— both agree on `v0.4.8`.
**Security advisories:** None found via WebSearch.

### cspell (npm): v10.0.1 (current, no change)

**Verified via:** `registry.npmjs.org/cspell/latest` → `10.0.1`, matching
`package.json`'s `^10.0.1`.
**Security advisories:** None found via WebSearch.

### j178/prek-action: v2.0.5 (new discovery — official GHA wrapper for prek)

**Verified via:** `gh api repos/j178/prek-action/releases/latest`
(published 2026-06-29) and `/tags` — both agree. **SHA:**
`e98a699c41eb69ab013a45817a0406469a748f8d`. Confirmed as the officially
documented CI integration path in `j178/prek`'s own README ("prek can be
used in GitHub Actions via the j178/prek-action repository").
**Security advisories:** None found.
**Design relevance:** see the Design Decision section below — not used in
the primary recommendation for this repo, for reasons specific to how this
repo already single-sources `prek`'s version.

## Step 3 (continued): Design-correctness findings

These aren't version deltas — they're cases where a hook that works
correctly as a local git pre-commit hook would silently misbehave (or fail
outright) if `prek run --all-files` is pointed at a fresh CI checkout
without adjustment.

### Design decision: invoke `prek` via npm, not `j178/prek-action`

`j178/prek-action` (verified above) is the tool's own documented CI path,
and it adds environment caching for free. But this repo already
single-sources `prek`'s version through `package.json`'s `@j178/prek`
devDependency (the same "one source of truth" pattern the repo already uses
for `biome`, per `.pre-commit-config.yaml`'s own comments) — every "local"
hook (`biome`, `repo-invariants`, `readme-generated-blocks`, etc.) is
`language: system` and shells out to `npm run ...`, so Node/npm must be set
up regardless.

`j178/prek-action`'s `prek-version` input defaults to `latest` — a floating
reference. Using the action without pinning that input would let CI resolve
a different `prek` build than local developers get from `npm ci`, risking
divergent hook behavior between local and CI. Since Node/npm setup can't be
avoided anyway (the local hooks need it), the action buys no setup
simplification here, only an extra third-party action to SHA-pin and keep
in sync.

**Recommendation:** invoke `prek` from the already-pinned npm install
(`npm ci` then `npx prek run --all-files`), matching this repo's existing
`check:precommit:security` script pattern. **Your call:** if the team
instead wants the caching `j178/prek-action` provides out of the box, pin
it to `j178/prek-action@e98a699c41eb69ab013a45817a0406469a748f8d # v2.0.5`
with an explicit `prek-version: 0.4.8` to keep it in sync with
`package.json`, and drop the manual `actions/cache` step below (the action
handles caching itself).

### "gitleaks hook covers secret scanning in CI": CORRECTION

**Risk level:** CORRECTION
**What is stated (implicitly, by treating `prek run --all-files` as "the"
pre-commit CI gate):** Running the full hook suite in CI, including the
`gitleaks` hook, provides secret-scanning coverage equivalent to what it
provides locally.
**What is correct:** Verified by reading `gitleaks/gitleaks`'s
`.pre-commit-hooks.yaml` at tag `v8.30.1` directly: the hook's entry command
is `gitleaks git --pre-commit --redact --staged --verbose`. The `--staged`
flag makes gitleaks diff the git index against `HEAD`. On a fresh CI
checkout of a PR branch, nothing is staged — the working tree already
matches `HEAD` exactly — so this diff is empty and gitleaks reports zero
findings on every run, regardless of what the checked-out files contain.
(Confirmed this is unique to gitleaks among the five hook repos: `zizmor`,
`actionlint`, `shellcheck`, and `markdownlint-cli2`'s hook definitions all
take the actual file list from prek/pre-commit and lint file contents
directly — none of them are diff-based.)
**Why it matters:** A CI check that always reports green regardless of
content is worse than no check — it would create false confidence that PRs
are scanned for secrets when they never are.
**Fix:** Skip the `gitleaks` hook ID when running `prek run --all-files` in
CI (`SKIP=gitleaks`) and rely on this repo's existing `secrets` job in
`validate.yml`, which uses `gitleaks/gitleaks-action` with `fetch-depth: 0`
— a full-history scan, the correct tool for this job. The new workflow adds
no secret-scanning gap: it simply doesn't duplicate a check that already
exists correctly elsewhere.

### "claude-plugin-validate hook needs no extra CI setup": CORRECTION

**Risk level:** CORRECTION
**What is stated (implicitly):** `prek run --all-files` on a stock
`ubuntu-latest` runner (checkout + Node + `npm ci`) is sufficient to run
every hook in `.pre-commit-config.yaml`.
**What is correct:** The `claude-plugin-validate` hook runs
`npm run check:plugins:local`, which shells out to `claude plugin validate`.
The Claude Code CLI is not an npm devDependency and is not present on a
stock runner — this repo's own `.github/actions/validate-plugins` composite
action installs it separately (input `claude-cli-version`), which is itself
confirmation that dedicated provisioning is required, not an assumption.
**Why it matters:** Any PR touching `plugins/` or `.claude-plugin/` (most
PRs in a plugin-marketplace repo) would fail this hook with a
runner-configuration error, not a real validation failure — a broken
required check is as bad as no check.
**Fix:** Skip `claude-plugin-validate` (`SKIP=claude-plugin-validate`) and
keep relying on the existing `plugins` job in `validate.yml`, which already
provisions the CLI correctly. Installing the CLI a second time in this new
job would be redundant and would need its own version pin to avoid a
second, independently-drifting `claude-cli-version: latest` reference.

## Step 4: The proposed workflow

New file: `.github/workflows/pre-commit.yml`. Runs the full `prek` hook
suite (which already includes `markdownlint-cli2` and the `spelling`/cspell
hook) against every file on every PR, giving CI the same signal
`prek run --all-files` gives a developer locally.

```yaml
name: Pre-commit

# Runs the full prek hook suite (see .pre-commit-config.yaml) against every
# file on every PR. .pre-commit-config.yaml already defines the
# markdownlint-cli2 and spelling (cspell) hooks, so this one job covers
# "pre-commit hooks, markdownlint, and cspell" without a separate job for
# either. Two hooks are skipped here (see comment on the run step) because
# they need CI-specific handling already covered by other jobs in
# validate.yml; every other hook in the file — including biome,
# repo-invariants, automation-script-tests, validate-plugins-smoke-tests,
# readme-generated-blocks, yaml-syntax, spelling, markdown-links,
# markdownlint-cli2, actionlint, shellcheck, and zizmor — runs here.
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  prek:
    name: Pre-commit hooks (prek)
    runs-on: ubuntu-latest
    steps:
      - name: Configure git defaults
        run: git config --global init.defaultBranch main
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: 24
          cache: npm
      - run: npm ci --loglevel=error
      - name: Resolve prek cache directory
        id: prek-cache-dir
        run: echo "dir=$(npx prek cache dir)" >> "$GITHUB_OUTPUT"
      - name: Cache prek hook environments
        uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ${{ steps.prek-cache-dir.outputs.dir }}
          key: prek-${{ runner.os }}-${{ hashFiles('.pre-commit-config.yaml') }}
          restore-keys: |
            prek-${{ runner.os }}-
      - name: Run prek (all hooks except gitleaks and claude-plugin-validate)
        env:
          # gitleaks: its pre-commit hook runs `gitleaks git --staged`, which
          # diffs the git index against HEAD. A fresh CI checkout has nothing
          # staged, so this hook would report zero findings on every run
          # regardless of content — a false-confidence gap, not real
          # coverage. Full-history secret scanning is already handled
          # correctly by the "secrets" job in validate.yml
          # (gitleaks/gitleaks-action with fetch-depth: 0).
          #
          # claude-plugin-validate: needs the Claude Code CLI on PATH, which
          # this stock runner doesn't have. The "plugins" job in
          # validate.yml already installs it via
          # ./.github/actions/validate-plugins and runs this same check
          # correctly; installing the CLI a second time here would be
          # redundant.
          SKIP: gitleaks,claude-plugin-validate
        run: npx prek run --all-files --show-diff-on-failure --color=always
```

### Implementation notes

- No `fetch-depth: 0` is needed: every remaining hook (markdownlint-cli2,
  spelling/cspell, actionlint, shellcheck, zizmor, biome, and all the local
  `npm run` hooks) operates on working-tree file content under
  `--all-files`, not git history. `fetch-depth: 0` is specifically a
  `secrets`-job requirement in `validate.yml` for its full-history
  `gitleaks-action` scan.
- `--all-files` causes essentially every hook to run even though several
  declare narrow `files:` patterns: with `pass_filenames: false` and a
  full-repo file set, each hook's trigger pattern almost always matches
  something, so the whole config effectively runs as one suite. This is the
  intended full-repo CI behavior (distinct from a local `git commit`, which
  only runs hooks against staged/changed files).
- The `biome` and `readme-generated-blocks` hooks call `npm run lint:fix`
  and `npm run docs:readme` respectively, which write files. This mirrors
  local pre-commit behavior exactly (per the input file's own comments): if
  a file is rewritten, `prek` reports the hook as failed because it detects
  the diff it just made, correctly blocking the PR so a human re-stages the
  fix. No special CI handling is needed for this — it's a working-tree
  runner, nothing is pushed back automatically.
- Optional follow-up (not required for this plan): add an npm script (e.g.
  `"check:precommit:all": "prek run --all-files"`) to `package.json` for
  parity with the existing `check:precommit:security` script, so the exact
  CI invocation is also a one-line local command. Not included in the YAML
  above since it changes `package.json`, which is outside the reviewed
  input files for this task.
- This plan adds `.github/workflows/pre-commit.yml` as a new, independent
  workflow rather than folding it into `validate.yml`, since it's an
  additive check with its own trigger surface. **Your call:** it could
  instead be added as a new job inside `validate.yml` if you'd rather keep
  one workflow file; behavior is identical either way.
- `validate.yml` already runs several jobs that overlap with hooks in
  `.pre-commit-config.yaml` (its own `markdown` job vs. the `markdownlint-cli2`
  hook here; its `repository` job's `npm run lint:spelling` vs. the
  `spelling` hook here; its `workflows` job vs. the `actionlint`/`shellcheck`/
  `zizmor` hooks here). This plan does not remove or change those existing
  jobs — consolidating them is a separate, larger decision or that's a
  bigger, separate decision outside this task's scope (it changes existing,
  working CI rather than adding new coverage). **Your call:** keep both for
  redundancy, or consolidate once this new job is proven stable.

## Step 5: Findings by risk level

1. **SECURITY** — none found.
2. **DEPRECATION** — none found.
3. **BREAKING-UPGRADE** — none found.
4. **ROUTINE**
   - `DavidAnson/markdownlint-cli2` (pre-commit hook): v0.22.1 → v0.23.0
   - `zizmorcore/zizmor-pre-commit`: v1.25.2 → v1.26.1
5. **CORRECTION**
   - `.pre-commit-config.yaml`'s markdownlint-cli2 comment: "the latest tag"
     is now stale (see below)
   - Implicit assumption that the `gitleaks` hook provides CI secret-scanning
     coverage under `--all-files` (it doesn't — see above)
   - Implicit assumption that `claude-plugin-validate` needs no extra CI
     provisioning (it does — see above)

### `.pre-commit-config.yaml` markdownlint-cli2 comment: CORRECTION

**Risk level:** CORRECTION
**What is stated:** Line 91's comment: "SHA-frozen to v0.22.1, the latest
tag (this project ships NO GitHub releases; tags are the only source)."
**What is correct:** The "no GitHub releases" part is accurate (confirmed:
`releases/latest` returns 404). But v0.22.1 is no longer the latest tag —
`v0.23.0` was tagged afterward (see the ROUTINE finding above).
**Why it matters:** A maintainer reading this comment would believe the pin
is already current and skip re-checking, silently missing the routine bump.
**Fix:** Either bump to v0.23.0 now (making the comment true again), or
reword to something that doesn't assert present-tense currency, e.g.
"SHA-frozen to v0.22.1 (latest tag as of the date this was pinned; verify
before assuming currency)."

## Step 6: Verification log

| Claim | Tool | Source | Finding |
|---|---|---|---|
| actions/checkout latest = v7.0.0 | Bash (`gh api`) | `api.github.com/repos/actions/checkout/releases/latest`, `/tags` | Confirmed; matches existing repo pin |
| actions/checkout v7.0.0 commit SHA | Bash (`gh api`) | `.../actions/checkout/git/refs/tags/v7.0.0` | `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` (direct commit) |
| actions/setup-node latest = v6.4.0 | Bash (`gh api`) | `.../actions/setup-node/releases/latest`, `/tags` | Confirmed; matches existing repo pin |
| actions/setup-node v6.4.0 commit SHA | Bash (`gh api`) | `.../actions/setup-node/git/refs/tags/v6.4.0` | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` (direct commit) |
| actions/cache latest = v6.1.0 | Bash (`gh api`) | `.../actions/cache/releases/latest`, `/tags` | v6.1.0 (new to this repo) |
| actions/cache v6.1.0 commit SHA | Bash (`gh api`) | `.../actions/cache/git/refs/tags/v6.1.0` | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` (direct commit) |
| j178/prek-action latest = v2.0.5 | Bash (`gh api`) | `.../j178/prek-action/releases/latest`, `/tags` | v2.0.5; documented alternative, not primary recommendation |
| j178/prek-action v2.0.5 commit SHA | Bash (`gh api`) | `.../j178/prek-action/git/refs/tags/v2.0.5` | `e98a699c41eb69ab013a45817a0406469a748f8d` (direct commit) |
| j178/prek-action is the official CI integration path | WebFetch | `github.com/j178/prek` README (fetched via `gh api contents`) | Confirmed: "prek can be used in GitHub Actions via the j178/prek-action repository" |
| @j178/prek npm latest = 0.4.8 | Bash (`curl registry.npmjs.org`) | `registry.npmjs.org/@j178/prek/latest` | Matches `package.json`'s `^0.4.8`, already current |
| cspell npm latest = 10.0.1 | Bash (`curl registry.npmjs.org`) | `registry.npmjs.org/cspell/latest` | Matches `package.json`'s `^10.0.1`, already current |
| DavidAnson/markdownlint-cli2-action latest = v24.0.0 | Bash (`gh api`) | `.../markdownlint-cli2-action/releases/latest`, `/tags` | Matches `validate.yml`'s existing pin (SHA `8de2aa07cae85fd17c0b35642db70cf5495f1d25`), already current |
| DavidAnson/markdownlint-cli2 (hook repo) latest tag | Bash (`gh api`) | `.../markdownlint-cli2/releases/latest` (404 — no Releases), `/tags` | Latest tag v0.23.0; input file pinned to v0.22.1 → ROUTINE delta |
| markdownlint-cli2 v0.22.1→v0.23.0 changelog | Bash (`gh api compare`) | `.../markdownlint-cli2/compare/v0.22.1...v0.23.0` | Dependency bumps + additive `overrides` config property; no breaking changes |
| markdownlint-cli2 v0.23.0 commit SHA | Bash (`gh api`) | `.../markdownlint-cli2/git/refs/tags/v0.23.0` | `534166213006ec869b773b7ed8c6ebeaad1165d0` (direct commit) |
| gitleaks/gitleaks-action latest = v3.0.0 | Bash (`gh api`) | `.../gitleaks-action/releases/latest`, `/tags` | Matches `validate.yml`'s existing pin, already current |
| gitleaks/gitleaks latest = v8.30.1 | Bash (`gh api`) | `.../gitleaks/gitleaks/releases/latest`, `/tags` | Matches both the input file's frozen pin and `validate.yml`'s `GITLEAKS_VERSION` env var, already current |
| gitleaks pre-commit hook uses `--staged` | Bash (`gh api contents`) | `.../gitleaks/gitleaks/.pre-commit-hooks.yaml@v8.30.1` | Confirmed entry is `gitleaks git --pre-commit --redact --staged --verbose` — diff-based, empty on a fresh checkout |
| zizmor/actionlint/shellcheck/markdownlint-cli2 hooks are file-based, not diff-based | Bash (`gh api contents`) | `.pre-commit-hooks.yaml` at each repo's pinned tag | Confirmed none of the other four hooks use `--staged` or similar; gitleaks is the outlier |
| rhysd/actionlint latest = v1.7.12 | Bash (`gh api`) | `.../actionlint/releases/latest`, `/tags` | Matches input file's pin, already current |
| shellcheck-py/shellcheck-py latest tag | Bash (`gh api`) | `.../shellcheck-py/releases/latest` (404 — no Releases), `/tags` | v0.11.0.1 matches input file's pin, already current |
| zizmorcore/zizmor-pre-commit latest tag | Bash (`gh api`) | `.../zizmor-pre-commit/releases/latest`, `/tags` | v1.26.1; input file pinned to v1.25.2 → ROUTINE delta |
| zizmor v1.26.0/v1.26.1 release notes | Bash (`gh api releases/tags`) | `.../zizmorcore/zizmor/releases/tags/v1.26.0`, `/v1.26.1` | v1.26.0 adds 3 new audits incl. `typosquat-uses`; v1.26.1 is a small corrective release; no breaking changes |
| zizmor-pre-commit v1.26.1 commit SHA | Bash (`gh api`) | `.../zizmor-pre-commit/git/refs/tags/v1.26.1` | `e3eebf65325ccc992422292cb7a4baee967cf815` (direct commit) |
| All 5 frozen SHAs in input file match their stated tags | Bash (`gh api refs/tags`) | per-repo `git/refs/tags/{tag}` | All 5 verified byte-for-byte match (see table above) |
| prek cache directory has no fixed documented default path | WebFetch | `prek.j178.dev/reference/cli/` | Confirmed `prek cache dir` is the documented way to resolve it at runtime; used in the workflow instead of a hardcoded path |
| actions/checkout, setup-node, cache security posture | WebSearch | `"actions/checkout" OR "actions/setup-node" OR "actions/cache" CVE security advisory 2026` | No CVEs in these specific action versions; 2026 guidance reinforces SHA-pinning `actions/cache` too and `persist-credentials: false` (already followed) |
| gitleaks/actionlint/shellcheck security advisories | WebSearch | `"gitleaks actionlint shellcheck CVE security advisory 2026"` | No CVEs found for any of the three |
| markdownlint-cli2 security advisories | WebSearch | `"markdownlint-cli2 CVE security advisory 2026"` | No CVE/advisory found |
| zizmor security advisories | WebSearch | `"zizmor CVE security advisory 2026"` | No CVE/advisory found (zizmor is a scanner, not a scanned target) |
| cspell security advisories | WebSearch | `"cspell npm package CVE security advisory 2026"` | No CVE/advisory found for the `cspell` package itself |
| prek/j178 security advisories | WebSearch | `"prek j178 CVE security advisory pre-commit rust 2026"` | No CVE found; search surfaced `j178/prek-action` as the official CI action |

Self-check against the skill's Step 6 checklist:

- Every version sourced from a live lookup — yes, no `[UNVERIFIED]` markers
  needed.
- Both releases AND tags checked for every dependency — yes, including the
  two repos (`markdownlint-cli2`, `shellcheck-py`) where `/releases/latest`
  404s and tags are the only source.
- Every dependency covered by at least one security search — yes, see log.
- Changelogs read for both upgrades (not just version-existence confirmed)
  — yes, for both `markdownlint-cli2` and `zizmor`.
- SHA fetched for every GitHub Action reference in the proposed YAML, and
  for both recommended pre-commit hook bumps — yes; none required
  annotated-tag resolution (all were direct commit objects).
- Internal consistency checked across the input file and `validate.yml`
  (e.g., gitleaks version referenced in two places) — yes, confirmed
  consistent.
- False-contemporaneity claim check — found one: the markdownlint-cli2
  "the latest tag" comment, filed as its own CORRECTION above, separate
  from the version-delta finding.
