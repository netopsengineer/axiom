# Contributing

Thanks for improving the **axiom** marketplace. This guide is how to make a
change, verify it locally, and get it merged. Day to day the automation does the
heavy lifting - open a Conventional-Commit PR and CI handles versioning,
changelogs, releases, and dependency bumps.

## Local setup

You need:

- **Node** - the supported range is in `package.json` -> `engines` (CI runs the
  current LTS). Installs Biome and the release tooling.
- **The Claude Code CLI** (`claude` on your PATH) - for manifest validation.
- **[`prek`](https://prek.j178.dev)** - runs the git hooks (a fast drop-in for
  pre-commit).

```bash
npm install        # Biome + release tooling (dev-only; the shipped plugin has no deps)
prek install       # install the pre-commit hook that mirrors CI
```

## Make a change

1. Branch off `main`.
2. Make your edit, following the conventions in `CLAUDE.md` (kebab-case names,
   directory-format skills, register new plugins in `marketplace.json`, ...).
3. Run the checks below until they pass.
4. Open a PR whose **title is a valid Conventional Commit** - PRs squash-merge,
   so the title becomes the commit semantic-release reads.

## Checks

`prek run --all-files` runs everything CI runs, locally. Individually:

| Check      | Tool                                           | Auto-fix                                   |
|------------|------------------------------------------------|--------------------------------------------|
| JavaScript | Biome (`biome.jsonc`)                          | `npm run lint:fix`                         |
| Markdown   | markdownlint-cli2 (`.markdownlint-cli2.jsonc`) | `npx -y markdownlint-cli2 --fix "**/*.md"` |
| Manifests  | `claude plugin validate ./plugins/<name>`      | fix the flagged manifest                   |

The hook auto-fixes formatting on commit; if it rewrites a file, the commit
stops so you can `git add` the result and commit again. Other useful commands:

```bash
npm run lint           # Biome, read-only — exactly what CI runs
npm run release:dry    # preview the next release; changes and publishes nothing
```

## Commit & PR conventions

[Conventional Commits](https://www.conventionalcommits.org), optionally prefixed
with a [gitmoji](https://gitmoji.dev). A conventional `type:` is **required** - a
bare emoji on its own does not trigger a release.

All of these header shapes parse correctly:

```text
✨ feat: add live version verification
🐛 fix(api): correct tag resolution
feat: ✨ emoji after the type also works
:sparkles: feat(scope): shortcode form works too
feat!: drop the legacy format          # "!" marks a breaking change
```

The type decides the version bump:

| Commit type                                                  | Release                |
|--------------------------------------------------------------|------------------------|
| `feat:`                                                      | minor (1.0.0 -> 1.1.0) |
| `fix:` / `perf:`                                             | patch (1.0.0 -> 1.0.1) |
| `feat!:` / any `BREAKING CHANGE:` footer                     | major (1.0.0 -> 2.0.0) |
| `chore:` `ci:` `docs:` `refactor:` `test:` `style:` `build:` | no release             |

Never hand-edit the plugin `version` or `CHANGELOG.md` - semantic-release owns
both.

## How releases & CI work

All workflows live in `.github/`; every third-party action is SHA-pinned.

| Workflow                                       | Trigger             | What it does                                                                          |
|------------------------------------------------|---------------------|---------------------------------------------------------------------------------------|
| `validate.yml`                                 | PR + push to `main` | `claude plugin validate` + markdownlint + Biome - the three required checks           |
| `release.yml`                                  | push to `main`      | semantic-release: bump the manifest, update `CHANGELOG.md`, tag, cut a GitHub Release |
| `bump-validate-action.yml`                     | daily + manual      | re-pins the tagless validate action to the latest upstream SHA via an auto-merged PR  |
| `dependabot.yml` + `dependabot-auto-merge.yml` | daily               | bump GitHub Actions + npm tooling, auto-merged once CI is green                       |

No Anthropic credentials are needed anywhere, and `claude plugin validate` runs
offline. Releases run under a short-lived **GitHub App token** - the
`axiom-release-bot` app is the bypass actor on the `main` ruleset, because the
built-in `GITHUB_TOKEN` can't push to a branch with required status checks. The
app's ID and key live in the `APP_ID` variable and `APP_PRIVATE_KEY` secret.
`package.json` / `package-lock.json` are **release- and lint-tooling only** -
this is not an npm project, and the shipped plugin carries no npm dependencies.

## Adding a plugin

See `CLAUDE.md` -> "Adding a plugin": create
`plugins/<name>/.claude-plugin/plugin.json` (plus `README.md` and `CHANGELOG.md`)
and register it in `.claude-plugin/marketplace.json` with a relative
`source: "./plugins/<name>"`. This config versions the marketplace as a **single
unit**; for independent per-plugin versions later, split `release.config.js` (see
its header comment).

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

- **Merged to `main` but no release.** The PR title wasn't a releasing type -
  only `feat`, `fix`, `perf`, and breaking changes release; `chore:` / `docs:` /
  `ci:` / etc. are intentionally silent. Check the `Release` workflow run.
- **A gitmoji commit didn't release.** It needs a conventional `type:` after the
  emoji (`✨ feat: ...`, not just `✨ ...`).
- **The commit was rejected by the hook.** A formatter rewrote a file - re-stage
  with `git add` and commit again. Run `prek run --all-files` to see what fired.
- **`bump-validate-action` PR is stuck with no checks.** A `GITHUB_TOKEN`-created
  PR can't trigger workflows, so the job dispatches the checks against the branch.
  If your ruleset doesn't honor dispatched checks, add a fine-grained PAT (repo
  `contents` + `pull-requests` write) and use it for that workflow's PR step.
- **A Dependabot PR won't auto-merge.** Confirm "Allow auto-merge" is on and the
  required checks pass. All update types auto-merge by default; to hold majors
  back, uncomment the `update-type` guard in `dependabot-auto-merge.yml`.
