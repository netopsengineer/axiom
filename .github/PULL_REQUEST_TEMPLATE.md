<!-- markdownlint-disable-file MD041 -->
## What & why

<!-- One or two sentences. Link issues with "Closes #N". -->

## Release impact

This repo squash-merges, and **the PR title becomes the release commit**.
semantic-release derives the version bump from it (see `release.config.js`):

- `feat:` → minor &middot; `fix:` / `perf:` → patch
- `feat!:` or a `BREAKING CHANGE:` footer → major
- `chore:` / `ci:` / `docs:` / `refactor:` / `test:` / `style:` / `build:` → no release

A leading gitmoji is allowed only before a conventional type (e.g. `✨ feat: ...`).
The **PR Title** check enforces this.

## Checklist

- [ ] PR title is a valid Conventional Commit (the **PR Title** check is green).
- [ ] If a `SKILL.md` changed, its `evals/evals.json` was updated and the skill
      was re-evaluated — or I've said below why a re-eval isn't needed.
- [ ] Ran the relevant checks: `npm run lint`,
      `claude plugin validate ./plugins/<plugin>`, and markdownlint on edited
      Markdown.
- [ ] No hand-edits to `version` in `plugin.json` or to `CHANGELOG.md`
      (semantic-release owns these).
