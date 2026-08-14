# Agent Instructions

## Scope

- Repository: `axiom`.
- Product: Claude Code and Codex plugin marketplace.
- Canonical catalog: `.axiom/marketplace.json`.
- Generated catalogs: `.claude-plugin/marketplace.json` and
  `.agents/plugins/marketplace.json`.
- Plugins live under `plugins/<plugin>`. Do not assume a default current plugin;
  infer the relevant plugin from the user request or changed files.
- Claude compatibility file: `CLAUDE.md` imports this file.

## Repository Map

```text
.axiom/marketplace.json
.agents/plugins/marketplace.json
.claude-plugin/marketplace.json
plugins/<plugin>/.axiom/plugin.json
plugins/<plugin>/.claude-plugin/plugin.json
plugins/<plugin>/.codex-plugin/plugin.json
plugins/<plugin>/README.md
plugins/<plugin>/CHANGELOG.md
plugins/<plugin>/package.json
plugins/<plugin>/release.config.js
plugins/<plugin>/skills/<skill>/SKILL.md
plugins/<plugin>/skills/<skill>/evals/evals.json
plugins/<plugin>/skills/<skill>/reference.md
dev/<plugin>/
.github/workflows/
.github/scripts/
package.json
package-lock.json
```

## Canonical Sources

- `.axiom/marketplace.json` owns marketplace identity and ordered plugin names.
- `plugins/<plugin>/.axiom/plugin.json` owns common metadata, release version,
  components, and platform-specific metadata. Semantic-release owns its
  `version`.
- Put Claude-only metadata under `platforms.claude` and Codex-only metadata
  under `platforms.codex`. Do not place host-specific metadata in common fields.
- `.agents/plugins/marketplace.json`, `.claude-plugin/marketplace.json`, and
  both vendor manifests under `plugins/<plugin>/` are generated. Never author
  them directly.
- `plugins/<plugin>/README.md` owns plugin-level docs and must include a
  non-empty `## Eval history` section.
- `plugins/<plugin>/skills/<skill>/evals/evals.json` owns shipped eval scenario
  coverage for that skill.
- `dev/<plugin>/` owns eval run output, grading artifacts, benchmark workspaces,
  and other non-shipped eval data.
- The root `README.md` is partly generated from the sources above. Do not treat
  generated root README content as canonical data.

## Ownership Matrix

| Data                                        | Canonical owner                                    | Generated or runtime consumers                   |
|---------------------------------------------|----------------------------------------------------|--------------------------------------------------|
| Marketplace identity and plugin order       | `.axiom/marketplace.json`                          | both catalogs, README generators, invariants     |
| Common plugin metadata, version, components | `plugins/<plugin>/.axiom/plugin.json`              | both manifests, catalogs, release preparation    |
| Claude-only catalog metadata                | canonical `platforms.claude`                       | Claude catalog and Claude-facing docs            |
| Codex-only catalog metadata and policy      | canonical `platforms.codex`                        | Codex catalog, Codex manifest, Codex-facing docs |
| Skill behavior                              | `plugins/<plugin>/skills/<skill>/SKILL.md`         | Claude Code and Codex installs                   |
| Eval scenarios                              | `plugins/<plugin>/skills/<skill>/evals/evals.json` | repository gates and eval index                  |
| Scored eval provenance                      | plugin `README.md` `## Eval history`               | reviewers and generated eval index               |
| Vendor catalogs and manifests               | canonical compiler output                          | Claude Code and Codex CLIs                       |

## Edit Rules

- Keep plugin names, skill names, and directories lowercase kebab-case.
- Use directory-format skills only: `skills/<skill>/SKILL.md`.
- Register each plugin by adding only its name to `.axiom/marketplace.json`
  after creating `plugins/<plugin>/.axiom/plugin.json`.
- Treat `package.json` and `package-lock.json` as repository release, lint, and
  validation tooling only. Shipped plugins must not depend on root npm packages
  at runtime.
- Do not hand-edit either vendor catalog or vendor manifest.
- Do not hand-edit `plugins/<plugin>/CHANGELOG.md`.
- Repair an empty historical release section only with
  `.github/scripts/backfill-plugin-changelog.mjs`. Pass the registered plugin
  root, previous tag, and empty release tag. Stop if the target section already
  has content or the tagged commit range cannot generate release notes.
- Semantic-release owns plugin version bumps, changelog entries, tags, and
  GitHub Releases. Release preparation changes the canonical version and emits
  both generated vendor manifests in one transaction.
- Do not modify `dev/` or `plugins/` unless the user explicitly asks. Read them
  only as needed for validation, packaging context, or release wiring.
- Ignore local scratch unless explicitly requested:
  `.DS_Store`, `*.local.md`, `.claude/settings.local.json`, `.claude/plans/`,
  `DEMO-file-example-spec.md`, `DEMO-skill-creator-evals.md`,
  `skill-evals-showcase.html`, and `what-is-a-skill.png`.
- Keep eval run output under `dev/<plugin>/`. Do not move eval run data into a
  shipped plugin directory.
- Do not hand-edit generated root `README.md` regions. Update their canonical
  sources, then run `npm run docs:readme`.
- Treat public directory publication as an explicit external operation. A
  repository release must not submit to or publish in a public directory.

## Generated README Regions

The root `README.md` has three generated marker blocks:

- `plugin-badges`: generated by `.github/scripts/sync-readme-badges.mjs` from
  canonical marketplace and plugin records.
- `eval-index`: generated by `.github/scripts/sync-readme-evals.mjs` from the
  canonical marketplace order, shipped skill eval manifests, and plugin README
  eval history sections.
- `plugin-list`: generated by `.github/scripts/sync-readme-plugins.mjs` from
  canonical marketplace and plugin records.

Use these commands for generated README work:

```bash
npm run docs:readme
```

```bash
npm run docs:readme:check
```

If a generated block is wrong, fix the source data or generator. Do not patch
the generated block directly.

## Adding A Plugin

When adding a shipped plugin:

- Create `plugins/<plugin>/` using lowercase kebab-case.
- Add `plugins/<plugin>/.axiom/plugin.json`, README, changelog, package release
  stub, and release config.
- Add `plugins/<plugin>/README.md` with a non-empty `## Eval history` section.
- Add at least one directory-format skill under
  `plugins/<plugin>/skills/<skill>/SKILL.md`.
- Add shipped eval coverage under
  `plugins/<plugin>/skills/<skill>/evals/evals.json`.
- Put eval run output, grading, and benchmarks under `dev/<plugin>/`, not under
  `plugins/<plugin>/`.
- Add only the plugin name to the ordered `.axiom/marketplace.json` plugin
  array.
- Run `npm run generate` to produce both catalogs, both manifests, and generated
  README blocks.
- Run repository, Claude, Codex, eval, documentation, and release contract
  checks.
- Never author either vendor catalog or vendor manifest directly.
- Do not add public-submission placeholders, publisher identity, legal URLs, or
  listing assets unless the user explicitly supplies and requests them.

## Release Inputs

- PR source branch names must be `feat/<short-kebab-slug>`,
  `fix/<short-kebab-slug>`, or `chore/<short-kebab-slug>`. Dependabot branches
  under `dependabot/**` are allowed automation. The `Branch name` PR check
  enforces this.
- PR squash commit title must be a valid Conventional Commit.
- Version impact:
    - `feat:` gives a minor release.
    - `fix:` and `perf:` give a patch release.
    - `feat!:` or a `BREAKING CHANGE:` footer gives a major release.
    - `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, `style:`, and `build:` do
    not release.
- The type is the header prefix (stock Conventional Commits) — nothing precedes
  it. A gitmoji, if used, goes immediately after the colon as the start of the
  subject (`feat(scope): ✨ subject`), never before the type (`✨ feat:`). The
  `Conventional Commit title` PR check enforces this.

## Validation

Run the smallest relevant check set for the files changed.

For generated root README blocks:

```bash
npm run docs:readme:check
```

For all canonical and generated marketplace artifacts:

```bash
npm run generate
```

```bash
npm run generate:check
```

For branch-name convention changes or local testing of a branch name:

```bash
PR_BRANCH=chore/example-slug npm run check:branch-name
```

For JavaScript tooling changes:

```bash
npm run lint
```

```bash
npm run lint:fix
```

For release-note generation or historical changelog recovery:

```bash
node --test .github/scripts/release-tooling-contract.test.mjs
```

```bash
node .github/scripts/backfill-plugin-changelog.mjs \
  plugins/<plugin> <previous-tag> <empty-release-tag>
```

For marketplace entries, shipped plugin layout, skill directories, or shipped
eval manifests:

```bash
npm run check:repo
```

For plugin manifest or shipped plugin structure changes, validate the specific
plugin. If multiple shipped plugins changed, run `npm run check:plugins:local`
instead.

```bash
claude plugin validate ./plugins/<plugin>
```

For isolated Claude marketplace discovery and installation:

```bash
npm run check:claude:smoke
```

For native Codex static validation and isolated discovery and installation:

```bash
npm run check:codex:static
```

```bash
npm run check:codex:smoke
```

```bash
npm run check:codex
```

For workflow, Dependabot, pre-commit, or repository YAML changes:

```bash
npm run lint:yaml
```

For GitHub Actions or pre-commit security hook changes:

```bash
npm run check:precommit:security
```

For spelling-sensitive docs/config changes:

```bash
npm run lint:spelling
```

For Markdown edits that add or change links:

```bash
npm run lint:links
```

For broad pre-commit parity before handing off a cross-cutting change:

```bash
npx prek run --all-files
```

For Markdown edits, run the targeted Markdown quality pass in
[Markdown Rules](#markdown-rules).

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
