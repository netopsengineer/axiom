# Contributing

Thanks for improving the **axiom** marketplace. This guide is how to make a
change, verify it locally, and get it merged. Day to day the automation does the
heavy lifting - open a Conventional-Commit PR and CI handles versioning,
changelogs, releases, and dependency bumps per plugin.

## Local setup

You need:

- **Node** - the supported range is in `package.json` -> `engines` (CI runs the
  current LTS). Installs Biome and the release tooling.
- **The Claude Code CLI** (`claude` on your PATH) - for manifest validation.
- **[`prek`](https://prek.j178.dev)** - runs the git hooks (a fast drop-in for
  pre-commit).

```bash
npm install        # Biome + release tooling (dev-only; the shipped plugin has no deps)
prek install       # install the local pre-commit checks
```

## Make a change

1. Branch off `main` using `feat/<short-kebab-slug>`,
   `fix/<short-kebab-slug>`, or `chore/<short-kebab-slug>`.
2. Make your edit, following the conventions in `CLAUDE.md` (kebab-case names,
   directory-format skills, register new plugins in `marketplace.json`, ...).
3. Run the checks below until they pass.
4. Open a PR whose **title is a valid Conventional Commit** - PRs squash-merge,
   so the title becomes the commit semantic-release reads.

## Checks

`prek run --all-files` mirrors the local/static checks from `validate.yml` and
also runs the automation script tests wired into pre-commit. It does not run
every CI job, especially checks that depend on PR metadata, scheduled workflow
context, or live service credentials. Individually:

| Check              | Tool                                           | Auto-fix                                   |
|--------------------|------------------------------------------------|--------------------------------------------|
| Branch             | `.github/scripts/check-branch-name.mjs`        | rename the PR source branch                |
| JavaScript         | Biome (`biome.jsonc`)                          | `npm run lint:fix`                         |
| Markdown           | markdownlint-cli2 (`.markdownlint-cli2.jsonc`) | `npx -y markdownlint-cli2 --fix "**/*.md"` |
| Manifests          | `claude plugin validate ./plugins/<name>`      | fix the flagged manifest                   |
| Automation scripts | Node's built-in test runner                    | fix the flagged helper behavior            |

The hook auto-fixes formatting on commit; if it rewrites a file, the commit
stops so you can `git add` the result and commit again. Other useful commands:

```bash
npm run lint           # Biome, read-only — exactly what CI runs
PR_BRANCH="$(git rev-parse --abbrev-ref HEAD)" npm run check:branch-name
BR="$(git rev-parse --abbrev-ref HEAD)"
cd plugins/<plugin>
npx --no-install semantic-release --dry-run --no-ci --branches "$BR"
```

## Commit & PR conventions

PR source branches must use one of these forms:

```text
feat/<short-kebab-slug>
fix/<short-kebab-slug>
chore/<short-kebab-slug>
```

Dependabot branches under `dependabot/**` are allowed separately so dependency
automation can keep running. Branch names do not decide release behavior; the PR
title does.

[Conventional Commits](https://www.conventionalcommits.org) are required. The
type must be the first text in the title. A [gitmoji](https://gitmoji.dev) can
go after the colon as subject text; a bare emoji or an emoji before the type does
not trigger a release and fails the PR title check.

All of these header shapes parse correctly:

```text
feat: ✨ add live version verification
fix(api): 🐛 correct tag resolution
feat(scope): :sparkles: shortcode form works too
feat!: drop the legacy format          # "!" marks a breaking change
```

The type decides the version bump. For a breaking change, prefer `<type>!:` in
the PR title because the title becomes the squash commit subject. Rely on a
`BREAKING CHANGE:` footer only if repository squash settings preserve the PR body
into the commit body.

| Commit type                                                  | Release                |
|--------------------------------------------------------------|------------------------|
| `feat:`                                                      | minor (1.0.0 -> 1.1.0) |
| `fix:` / `perf:`                                             | patch (1.0.0 -> 1.0.1) |
| `<type>!:`                                                   | major (1.0.0 -> 2.0.0) |
| `chore:` `ci:` `docs:` `refactor:` `test:` `style:` `build:` | no release             |

Never hand-edit the plugin `version` or `CHANGELOG.md` - semantic-release owns
both.

A release happens per plugin when both are true:

1. The squash commit changes at least one file under `plugins/<plugin>/**`.
2. The PR title has a releasable Conventional Commit type.

Files outside plugin paths, such as `.github/**`, `AGENTS.md`,
`CONTRIBUTING.md`, root `package.json`, and top-level `README.md`, do not release
anything by themselves. A single releasable PR that touches multiple plugin paths
can release multiple plugins.

## How releases & CI work

All workflows live in `.github/`; every third-party action is SHA-pinned.

| Workflow                                       | Trigger             | What it does                                                                                                                                              |
|------------------------------------------------|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `branch-name.yml`                              | PR                  | enforce predictable PR source branch names for human and agent branches                                                                                   |
| `pr-title.yml`                                 | PR                  | enforce Conventional Commit PR titles, which become squash commit subjects                                                                                |
| `validate.yml`                                 | PR + push to `main` | plugin validation, markdownlint, Biome, secret scanning, repository invariants, YAML syntax, spelling, Markdown links, workflow security lint             |
| `dependency-audit.yml`                         | daily + manual      | non-required audit gate (`npm run audit:ci`); fails only on high+ advisories not in `.github/npm-audit-allowlist.json`; advisory signal, not a merge gate |
| `dependency-audit-fix.yml`                     | daily + manual      | classifies `npm audit fix` exits; opens an auto-merged PR for valid lockfile-only fixes when package files change                                         |
| `release.yml`                                  | push to `main`      | run semantic-release for each plugin; changed plugin paths with releasable titles bump the manifest, update `CHANGELOG.md`, tag, and cut a GitHub Release |
| `bump-validate-action.yml`                     | daily + manual      | re-pins the tagless validate action to the latest upstream SHA via an auto-merged PR, gated by Validate plus validator smoke tests                        |
| `dependabot.yml` + `dependabot-auto-merge.yml` | daily               | bump GitHub Actions + npm tooling, auto-merged once CI is green                                                                                           |

No Anthropic credentials are needed anywhere, and `claude plugin validate` runs
offline. Releases run under a short-lived **GitHub App token** - the
`axiom-release-bot` app is the bypass actor on the `main` ruleset, because the
built-in `GITHUB_TOKEN` can't push to a branch with required status checks. The
app's ID and key live in the `APP_ID` variable and `APP_PRIVATE_KEY` secret. The
automation PRs are App-created intentionally because App/PAT-created events can
trigger PR workflows normally; the built-in `GITHUB_TOKEN` is used only for
`workflow_dispatch` calls from jobs that explicitly grant `actions: write`.
`package.json` / `package-lock.json` are **release- and lint-tooling only** -
this is not an npm project, and the shipped plugin carries no npm dependencies.
The repository's Actions **default token permission is read-only**; every
workflow declares explicit top-level permissions or explicit job-level
permissions on every job (enforced by `npm run check:repo`), so none silently
rely on the default. Write scopes are granted only to jobs that need them.
Dependency auditing is **self-managing**: `dependency-audit-fix.yml` classifies
`npm audit fix` exits, auto-fixes and auto-merges valid lockfile-only updates,
while the audit gate enforces allowlisted high+ leftovers. The few advisories
that have no available fix (e.g. a dependency bundled inside `npm` itself) go in
`.github/npm-audit-allowlist.json`, each with an **expiry** date and a reason so
it is forced back through review.
Validator bumps are also automated: `bump-validate-action.yml` updates the
vendored Anthropic validator scripts, dispatches `validate.yml` on the bump
branch, and enables auto-merge. That required Validate run includes
repo-owned smoke tests proving the bumped validator accepts a known-good plugin,
rejects a known-bad plugin, and treats warnings as fatal when configured.

## Adding a plugin

See `CLAUDE.md` -> "Adding a plugin": create
`plugins/<name>/.claude-plugin/plugin.json` (plus `README.md` and `CHANGELOG.md`)
and register it in `.claude-plugin/marketplace.json` with
`source: "./plugins/<name>"`. Add the plugin release stub at
`plugins/<name>/package.json` and the per-plugin release config at
`plugins/<name>/release.config.js`.

### The eval gate

The README promises that nothing here ships on vibes - that's a hard rule, not a
slogan, and it's what makes a one-plugin marketplace worth trusting at ten. Every
plugin lands with evals or it doesn't land:

- **Eval definitions ship with the skill** - `skills/<name>/evals/evals.json`,
  with enough scenarios to exercise what the skill claims to do. The skill
  description and README are promises; the evals are the proof.
- **Results live in the plugin README** - a short eval-history section with
  measured pass rates (copy the shape from `axiom-versioning`). Run data
  (iteration outputs, grades, timings) goes in `dev/<plugin-name>/` and is never
  shipped.
- **The bar: beat the baseline.** A skill has to measurably outperform Claude
  *without* it - that's the entire reason to ship it. Evals that don't clear that
  bar mean the skill isn't ready yet, not that the bar is wrong.

This is a review responsibility, not a CI check - evals need a live model and
human judgment, so `validate.yml` can't run them. It's on the reviewer to confirm
the evals exist and clear the bar before approving.

## Troubleshooting

- **Merged to `main` but no release.** The PR title was not a releasing type, or
  the commit did not touch a plugin path. Only `feat`, `fix`, `perf`, and
  breaking changes release; `chore:` / `docs:` / `ci:` / etc. are intentionally
  silent. Check the `Release` workflow run.
- **A gitmoji commit didn't release.** It needs a conventional `type:` after the
  emoji (`feat: ✨ ...`, not just `✨ ...`).
- **The commit was rejected by the hook.** A formatter rewrote a file - re-stage
  with `git add` and commit again. Run `prek run --all-files` to see what fired.
- **The Branch name check failed.** Rename the PR source branch to
  `feat/<short-kebab-slug>`, `fix/<short-kebab-slug>`, or
  `chore/<short-kebab-slug>`, then push the renamed branch.
- **`bump-validate-action` PR is stuck with no checks.** The PR is App-created so
  normal PR workflows should run, and the job also dispatches `validate.yml`
  against the branch with `GITHUB_TOKEN` under explicit `actions: write`. If no
  checks appear, verify the App token permissions, workflow dispatch settings,
  and required-check ruleset.
- **`bump-validate-action` PR did not auto-merge.** Check the `Plugin manifests`
  job first. A failed validator smoke test means the new upstream validator no
  longer preserves this repo's expected pass/fail behavior and should not land
  hands-off.
- **A Dependabot PR won't auto-merge.** Confirm "Allow auto-merge" is on and the
  required checks pass. All update types auto-merge by default; to hold majors
  back, uncomment the `update-type` guard in `dependabot-auto-merge.yml`.
