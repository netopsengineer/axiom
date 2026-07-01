<!-- markdownlint-disable-file MD041 -->
## What & why

<!-- One or two sentences. Link issues with "Closes #N". -->

## Release impact

This repo squash-merges, and **the PR title becomes the release commit**.
semantic-release derives the version bump from it (see the per-plugin
`plugins/<plugin>/release.config.js` files):

- `feat:` → minor &middot; `fix:` / `perf:` → patch
- `<type>!:` in the PR title → major
- `BREAKING CHANGE:` footer → major only if repository squash settings preserve it in the commit body
- `chore:` / `ci:` / `docs:` / `refactor:` / `test:` / `style:` / `build:` → no release

A releasable PR title releases each plugin path touched under
`plugins/<plugin>/**`. Files outside plugin paths do not release anything by
themselves.

PR source branches must be named `feat/<short-kebab-slug>`,
`fix/<short-kebab-slug>`, or `chore/<short-kebab-slug>`. Dependabot branches are
allowed separately. The **Branch name** check enforces this.

The type must come first (Conventional Commits). A gitmoji, if used, goes after
the colon (e.g. `feat: ✨ ...`), never before the type. The **PR Title** check
enforces this.

## Checklist

- [ ] PR branch matches the repository convention (the **Branch name** check is
      green).
- [ ] PR title is a valid Conventional Commit (the **PR Title** check is green).
- [ ] If a `SKILL.md` changed, its `evals/evals.json` was updated and the skill
      was re-evaluated — or I've said below why a re-eval isn't needed.
- [ ] Ran the relevant checks: `npm run lint`,
      `claude plugin validate ./plugins/<plugin>`, and markdownlint on edited
      Markdown.
- [ ] No hand-edits to `version` in `plugin.json` or to `CHANGELOG.md`
      (semantic-release owns these).
