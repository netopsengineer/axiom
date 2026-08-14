# Contributing

Thanks for improving the **axiom** marketplace. This guide is how to make a
change, verify it locally, and get it merged. Day to day the automation does the
heavy lifting - open a Conventional-Commit PR and CI handles versioning,
changelogs, releases, and dependency bumps per plugin.

## Local setup

You need:

- **Node** - the supported range is in `package.json` -> `engines` (CI runs
  Node 24). Installs Biome, the exact Claude and Codex CLIs used by validation,
  and the release tooling.
- **[`prek`](https://prek.j178.dev)** - runs the git hooks (a fast drop-in for
  pre-commit).

```bash
npm ci
prek install
```

The exact `@anthropic-ai/claude-code` and `@openai/codex` packages in root
`devDependencies` are repository validation tooling. The strict validators and
isolated smokes invoke them from `node_modules`; neither is a runtime dependency
of a shipped plugin. Dependabot advances both through the normal PR gates. The
name-only `allowScripts` entry permits the Claude wrapper to place its native
binary; the exact dependency version and lockfile constrain what npm installs.

## Make a change

1. Branch off `main` using `feat/<short-kebab-slug>`,
   `fix/<short-kebab-slug>`, or `chore/<short-kebab-slug>`.
2. Make your edit, following the canonical ownership and validation rules in
   `AGENTS.md`. `CLAUDE.md` imports that same contract.
3. Run the checks below until they pass.
4. Open a PR whose **title is a valid Conventional Commit** - PRs squash-merge,
   so the title becomes the commit semantic-release reads.

## Checks

`prek run --all-files` mirrors the local/static checks from `validate.yml` and
also runs the automation script tests wired into pre-commit. It does not run
every CI job, especially checks that depend on PR metadata, scheduled workflow
context, or live service credentials. Individually:

| Check                      | Tool or command                                             | Auto-fix or recovery                       |
|----------------------------|-------------------------------------------------------------|--------------------------------------------|
| Branch                     | `.github/scripts/check-branch-name.mjs`                     | rename the PR source branch                |
| Canonical generation       | `npm run generate:check`                                    | `npm run generate`, then stage outputs     |
| Repository contract        | `npm run check:repo`                                        | fix canonical input or repository layout   |
| Claude manifests and smoke | `npm run check:plugins:local`, `npm run check:claude:smoke` | fix canonical input or pinned CLI contract |
| Codex manifest and smoke   | `npm run check:codex:static`, `npm run check:codex:smoke`   | fix canonical input or pinned CLI contract |
| JavaScript                 | Biome (`biome.jsonc`)                                       | `npm run lint:fix`                         |
| Markdown                   | markdownlint-cli2 (`.markdownlint-cli2.jsonc`)              | `npx -y markdownlint-cli2 --fix "**/*.md"` |
| Automation scripts         | Node's built-in test runner                                 | fix the flagged helper behavior            |

The hook auto-fixes formatting on commit; if it rewrites a file, the commit
stops so you can `git add` the result and commit again. Other useful commands:

```bash
npm run generate:check
npm run check:repo
npm run check:plugins:local
npm run check:claude:smoke
npm run check:codex
npm run test
npm run lint
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

Never hand-edit `.axiom/plugin.json` `version`, either generated vendor
manifest, or `CHANGELOG.md`. Semantic-release owns the canonical version and
changelog. Release preparation writes that version to both vendor manifests in
one transaction.

If an existing tagged release has an empty changelog section, regenerate it
from the tagged commit range through the repository-owned recovery tool:

```bash
node .github/scripts/backfill-plugin-changelog.mjs \
  plugins/<plugin> <previous-tag> <empty-release-tag>
node --test .github/scripts/release-tooling-contract.test.mjs
```

The tool fills only an empty section and stops if the section already has
content. Do not replace this recovery with a direct changelog edit.

A release happens per plugin when both are true:

1. The squash commit changes at least one file under `plugins/<plugin>/**`.
2. The PR title has a releasable Conventional Commit type.

Files outside plugin paths, such as `.github/**`, `AGENTS.md`,
`CONTRIBUTING.md`, root `package.json`, and top-level `README.md`, do not release
anything by themselves. A single releasable PR that touches multiple plugin paths
can release multiple plugins.

## How releases & CI work

All workflows live in `.github/`; every third-party action is SHA-pinned.

| Workflow                                       | Trigger                                            | What it does                                                                                                                                                                                                           |
|------------------------------------------------|----------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `branch-name.yml`                              | PR                                                 | enforce predictable PR source branch names for human and agent branches                                                                                                                                                |
| `pr-title.yml`                                 | PR                                                 | enforce Conventional Commit PR titles, which become squash commit subjects                                                                                                                                             |
| `validate.yml`                                 | PR + push to `main`                                | generated drift, strict Claude validation, isolated Claude and Codex installs, Codex static validation, repository invariants, tests, markdownlint, Biome, secrets, YAML, spelling, links, and workflow security       |
| `dependency-audit.yml`                         | daily + dependency-tooling push to `main` + manual | all-severity audit gate (`npm run audit:ci`); the same zero-vulnerability gate is required in `validate.yml` on every pull request                                                                                     |
| `dependency-audit-fix.yml`                     | daily + manual                                     | classifies `npm audit fix` exits; opens an auto-merged PR for valid lockfile-only fixes when package files change; when nothing is fixable, reports the still-blocking advisories and the next step to the job summary |
| `release.yml`                                  | push to `main`                                     | run semantic-release for each plugin; releasable plugin changes bump the canonical version, emit both manifests, update `CHANGELOG.md`, tag, and cut a GitHub Release                                                  |
| `bump-validate-action.yml`                     | daily + manual                                     | re-pins the tagless validate action to the latest upstream SHA via an auto-merged PR, gated by Validate plus validator smoke tests                                                                                     |
| `release-note-compatibility.yml`               | weekly + manual                                    | probes the newest conventional-commits preset against release-note fixtures and npm audit; keeps a tracking issue open while blocked and auto-promotes a green major through a required-check PR                       |
| `dependabot.yml` + `dependabot-auto-merge.yml` | daily updates + scheduled merge scan               | bump GitHub Actions, npm tooling, and pre-commit hooks; the GitHub App enables protected auto-merge so the merge triggers main-branch workflows                                                                        |

No Anthropic credentials are needed anywhere, and `claude plugin validate` runs
offline. Releases run under a short-lived **GitHub App token** - the
`axiom-release-bot` app is the bypass actor on the `main` ruleset, because the
built-in `GITHUB_TOKEN` can't push to a branch with required status checks. The
app's ID and key live in the `APP_ID` variable and `APP_PRIVATE_KEY` secret. The
automation PRs are App-created intentionally because App/PAT-created events can
trigger PR workflows normally; the built-in `GITHUB_TOKEN` is used only for
`workflow_dispatch` calls from jobs that explicitly grant `actions: write`.
`package.json` and `package-lock.json` are **repository tooling only**. They
cover release, lint, validation, and the exact Claude and Codex CLI smoke
dependencies. This is not a published npm project, and shipped plugins carry no
npm dependencies.
The repository's Actions **default token permission is read-only**; every
workflow declares explicit top-level permissions or explicit job-level
permissions on every job (enforced by `npm run check:repo`), so none silently
rely on the default. Write scopes are granted only to jobs that need them.
Dependency auditing is **self-managing**: `dependency-audit-fix.yml` classifies
`npm audit fix` exits and auto-merges valid lockfile-only updates. The required
audit gate rejects every vulnerability severity and permits no threshold or
allowlist. An unresolved advisory stays red until its dependency is upgraded,
replaced, or removed.
Validator bumps are also automated: `bump-validate-action.yml` updates the
vendored Anthropic validator scripts, dispatches `validate.yml` on the bump
branch, and enables auto-merge. That required Validate run includes
repo-owned smoke tests proving the bumped validator accepts a known-good plugin,
rejects a known-bad plugin, and treats warnings as fatal when configured.

## Adding a plugin

Use the one-registration workflow in `AGENTS.md`:

1. Create `plugins/<name>/.axiom/plugin.json` with common metadata, components,
   and namespaced Claude Code and Codex metadata.
2. Add the plugin README, changelog seed, dependency-free release package stub,
   release config, shared skill, and shipped eval manifest.
3. Add only `<name>` to the ordered plugin array in
   `.axiom/marketplace.json`.
4. Run `npm run generate` to emit both catalogs, both vendor manifests, and the
   generated root README blocks.
5. Run `npm run generate:check`, `npm run check:repo`,
   `npm run check:plugins:local`, `npm run check:claude:smoke`, and
   `npm run check:codex` before the broader validation suite.

Do not author `.claude-plugin/marketplace.json`,
`.agents/plugins/marketplace.json`, or either per-plugin vendor manifest
directly.

### The eval gate

The README promises that nothing here ships on vibes - that's a hard rule, not a
slogan, and it's what makes a focused marketplace worth trusting at ten. Every
plugin lands with evals or it doesn't land:

- **Eval definitions ship with the skill** - `skills/<name>/evals/evals.json`,
  with enough scenarios to exercise what the skill claims to do. The skill
  description and README are promises; the evals are the proof.
- **Results live in the plugin README** - a short eval-history section with
  measured pass rates (copy the shape from `axiom-versioning`). Run data
  (iteration outputs, grades, timings) goes in `dev/<plugin-name>/` and is never
  shipped.
- **The bar: beat the named baseline.** A skill has to measurably outperform
  the same host and model without it. Evals that do not clear that bar mean the
  skill is not ready yet.

This is an evidence responsibility, not a credential-free CI check. A capable
agent may run and grade evals; a human grader is not required. Every recorded
result must name the host, executor model, grader model or grading method, date,
fixtures, score, and comparison baseline. Packaging smokes may prove Claude
Code and Codex installation without being relabeled as scored model evidence.
The reviewer must confirm that the evidence exists, is reproducible, and clears
the named baseline before approval.

Repository releases do not publish to a public plugin directory. Publisher
identity, listing assets, legal URLs, portal submission, review, and publication
are separate external operations requiring explicit authorization.

## Public directory submission readiness

Repository marketplace support does not complete a public directory
submission. A later authorized submission still requires a verified publisher
identity, listing assets, required legal and support URLs, portal entry, review,
and an explicit publication action. The submission evidence must also include a
portal-ready set of at least five positive and three negative tests. This
repository does not contain empty placeholders for those external materials and
does not publish them as a release side effect.

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
  required checks pass. All update types auto-merge by default except explicit
  entries in `dependabot.yml`; the release-note preset major is intentionally
  held and managed by `release-note-compatibility.yml`.
- **The release-note compatibility issue remains open.** The newest preset is
  still incompatible with the locked generator/writer path or its candidate
  audit is not clean. Inspect the latest workflow summary. The automation opens
  and auto-merges an upgrade PR only after both gates pass.
