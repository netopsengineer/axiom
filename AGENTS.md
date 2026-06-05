# Agent Instructions

## Scope

- Repository: `axiom`.
- Product: Claude Code plugin marketplace.
- Marketplace catalog: `.claude-plugin/marketplace.json`.
- Current plugin: `plugins/axiom-versioning`.
- Claude compatibility file: `CLAUDE.md` imports this file.

## Repository Map

```text
.claude-plugin/marketplace.json
plugins/<plugin>/.claude-plugin/plugin.json
plugins/<plugin>/README.md
plugins/<plugin>/CHANGELOG.md
plugins/<plugin>/skills/<skill>/SKILL.md
plugins/<plugin>/skills/<skill>/evals/evals.json
plugins/<plugin>/skills/<skill>/reference.md
dev/<plugin>/
.github/workflows/
.github/scripts/
package.json
package-lock.json
release.config.js
```

## Edit Rules

- Keep plugin names, skill names, and directories lowercase kebab-case.
- Use directory-format skills only: `skills/<skill>/SKILL.md`.
- Register each plugin in `.claude-plugin/marketplace.json` with
  `source: "./plugins/<plugin>"`.
- Treat `package.json` and `package-lock.json` as release and lint tooling only.
  Shipped plugins must not depend on root npm packages at runtime.
- Do not hand-edit `plugins/<plugin>/.claude-plugin/plugin.json` `version`.
- Do not hand-edit `plugins/<plugin>/CHANGELOG.md`.
- Semantic-release owns plugin version bumps, changelog entries, tags, and
  GitHub Releases.
- Do not modify `dev/` or `plugins/` unless the user explicitly asks. Read them
  only as needed for validation, packaging context, or release wiring.
- Ignore local scratch unless explicitly requested:
  `.DS_Store`, `*.local.md`, `.claude/settings.local.json`, `.claude/plans/`,
  `DEMO-file-example-spec.md`, `DEMO-skill-creator-evals.md`,
  `skill-evals-showcase.html`, and `what-is-a-skill.png`.
- Keep eval run output under `dev/<plugin>/`. Do not move eval run data into a
  shipped plugin directory.

## Release Inputs

- PR squash commit title must be a valid Conventional Commit.
- Version impact:
    - `feat:` gives a minor release.
    - `fix:` and `perf:` give a patch release.
    - `feat!:` or a `BREAKING CHANGE:` footer gives a major release.
    - `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, `style:`, and `build:` do
    not release.
- Gitmoji prefixes are allowed only when followed by a conventional type.

## Validation

Run the smallest relevant check set for the files changed.

```bash
npm run lint
```

```bash
npm run lint:fix
```

```bash
claude plugin validate ./plugins/<plugin>
```

```bash
npx -y markdownlint-cli2 --fix path/to/file.md
```

## Markdown Rules

- Every fenced code block must include an explicit language tag.
- Use `text` for plain output, logs, paths, directory trees, errors, and
  unstructured snippets.
- For nested fenced code blocks, the outer fence must use more backticks than
  the deepest inner fence.
- After editing Markdown, run a targeted quality pass on the edited files:

```bash
npx -y markdown-table-formatter path/to/file.md
```

```bash
npx -y markdownlint-cli2 --fix path/to/file.md
```

- If `npx` cannot write to its cache, rerun the failed command with a temp
  cache:

```bash
npm_config_cache=/private/tmp/codex-npm-cache npx -y markdownlint-cli2 --fix path/to/file.md
```

- Inspect the targeted Markdown diff after formatting:

```bash
git diff -- path/to/file.md
```

- Quote markdownlint-cli2 globs.
- Negate markdownlint-cli2 globs with `#`, not `!`.
- Use explicit file paths for targeted Markdown fixes.
- Do not rewrite unrelated Markdown sections to satisfy unrelated lint findings.
