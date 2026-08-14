# Dual Marketplace Automation Migration Plan

Status: COMPLETE

Repository: `netopsengineer/axiom`

Evidence date: 2026-08-13

## Goal command

Run this command from the repository root in Codex CLI:

```text
/goal Implement PLAN.md completely in this repository. Treat it as the canonical execution contract. Work checkpoint by checkpoint, preserve the Claude Code marketplace and every current autonomous release, validation, dependency, documentation, security, and eval loop, and add first-class native Codex marketplace support from one canonical source. Continue until every completion gate in PLAN.md passes and its execution record is complete. Stop only at a PLAN.md blocking gate that cannot be resolved safely from repository or current official-source evidence, and report the exact blocker.
```

The command is intentionally short. Codex goal objectives are limited to 4,000
characters, and official guidance recommends putting longer instructions in a
file, defining a verifiable stopping condition, working in checkpoints, and
keeping a progress log. See [Follow a goal] and the
[Codex developer command reference].

[follow a goal]: https://learn.chatgpt.com/use-cases/follow-goals
[codex developer command reference]: https://learn.chatgpt.com/docs/developer-commands

## Objective

Convert Axiom from a Claude-shaped repository that Codex currently accepts
through a compatibility fallback into a dual Claude Code and Codex marketplace
with these properties:

- One platform-neutral, versioned source owns catalog and plugin metadata.
- Deterministic adapters generate both vendor marketplace formats and both
  vendor plugin manifests.
- Existing Claude Code behavior remains intact.
- Native Codex discovery, installation, and packaged skill loading are tested
  without credentials or writes to a developer's real Codex state.
- Semantic-release updates one canonical plugin version and commits both
  generated manifests atomically with the plugin release.
- Existing hands-off dependency, validator, security, documentation, eval, and
  release automation remains active and is extended to cover Codex.
- Adding a future plugin requires one canonical registration operation, after
  which generation, validation, documentation, release, and dependency systems
  handle both marketplaces.

The goal is complete only when every item in [Completion gates](#completion-gates)
is satisfied and every required command in
[Final validation sequence](#final-validation-sequence) passes.

## Execution authority and boundaries

The `/goal` command that names this plan authorizes the repository-local edits
listed here, including the required edits under `plugins/`. It does not
authorize a commit, push, pull request, release, workspace publication, public
directory submission, credential change, GitHub ruleset change, or other
external write.

### In scope

- Canonical marketplace and plugin metadata.
- Generated Claude Code and Codex catalogs and manifests.
- Repository-owned generators, validators, tests, and release preparation.
- Root npm development tooling and lockfile changes needed for deterministic
  Codex CLI validation.
- Existing workflows, pre-commit hooks, Dependabot configuration, repository
  instructions, and human-facing documentation.
- Provider-neutral packaging compatibility for existing shared skills.
- Accurate eval provenance and compatibility claims.

### Out of scope

- Changing either skill's operational behavior solely to make the migration
  easier.
- Rewriting historical eval results or claiming that an eval ran on Codex when
  it did not.
- Adding MCP servers, apps, hooks, visual assets, legal URLs, or capabilities
  that the current plugins do not have.
- Publishing to OpenAI's universal public Plugins Directory or to a ChatGPT
  workspace.
- Submitting to Anthropic's public community marketplace.
- Refactoring unrelated release, audit, or security automation.
- Upgrading unrelated dependencies in the same change.

### External publication boundary

OpenAI currently separates repository marketplaces from the universal public
Plugins Directory. Repository support is fully in scope. Public submission is
portal-based, requires an authorized and verified publisher, listing assets,
five positive and three negative test cases, review, and a separate publish
action. No documented repository API makes that publication safe to infer from
this task. Generate native package metadata that is suitable for later
submission, but stop at a validated repository marketplace. See
[Package your plugin], [Submit your Claude Code plugin to OpenAI], and
[Submit plugins].

[package your plugin]: https://developers.openai.com/plugins/build/plugins
[submit your claude code plugin to openai]: https://developers.openai.com/plugins/guides/submit-claude-plugin
[submit plugins]: https://developers.openai.com/plugins/deploy/submission

## Execution protocol

Apply these rules throughout the goal run.

1. Read `AGENTS.md`, this plan, `package.json`, and all files named by the
   current checkpoint before editing.
2. Re-read current official platform documentation in Checkpoint 0. The
   evidence in this plan is a verified baseline, not permission to use stale
   external facts.
3. Inspect `git status --short --branch` before edits. Preserve unrelated user
   changes. Continue around non-overlapping changes. Stop only when an existing
   change overlaps a required span and cannot be preserved safely.
4. Do not use destructive Git commands. Do not erase or restore user-owned
   files. Use targeted patches.
5. Mark exactly one checkpoint `IN_PROGRESS` in the execution record. Change it
   to `PASSED` only after its acceptance gate passes.
6. Keep the repository runnable at every checkpoint. Establish the compiler and
   Claude parity before making any existing vendor file generated-only.
7. Add or update tests with the code that creates each new invariant. Do not
   defer the test suite to the final checkpoint.
8. Run the smallest checkpoint checks first. Run the complete validation
   sequence after all checkpoints.
9. When validation changes a file, rerun every earlier check that the change can
   affect.
10. Resolve implementation choices from repository evidence and current
    official contracts. Do not pause for preferences already decided by this
    plan.
11. Do not commit, push, publish, or change external settings. Leave a fully
    validated working tree and a completed execution record.
12. Stop only under [Blocking gates](#blocking-gates). Ordinary test failures,
    formatting fixes, upstream patch releases, and minor CLI output changes are
    repair work, not blockers.

### Notation

- `<plugin>` means a registered lowercase kebab-case plugin name that equals its
  directory name.
- `<skill>` means a lowercase kebab-case skill name that equals its directory
  name and `SKILL.md` frontmatter name.
- `<root>` means the resolved repository root or the resolved temporary fixture
  root named by the surrounding procedure.
- `<verified-version>` and `path/to/edited-file.md` are defined at their command
  sites and must be replaced before execution.

## Verified starting state

### Repository architecture

The following facts were verified against commit
`aa7d9e08a22649e74f7ea0c2a14b5189bff2c80e` on `main`:

- `.claude-plugin/marketplace.json` owns marketplace order, names,
  descriptions, categories, owner data, and local plugin sources.
- Each plugin owns metadata and release version in
  `plugins/<plugin>/.claude-plugin/plugin.json`.
- The two shipped plugins are `axiom-git` at `1.0.0` and
  `axiom-versioning` at `1.1.1`.
- Each plugin is skills-only and uses
  `skills/<skill>/SKILL.md` with `name` and `description` frontmatter.
- Shipped eval manifests cover 13 scenarios and 64 expectations. Historical
  scored results name their actual Claude models in plugin READMEs.
- README badges, the eval index, and the plugin list are generated from the
  Claude catalog and manifests.
- Semantic-release runs once per plugin, updates the Claude manifest version,
  updates the changelog, commits release assets, tags, and creates the GitHub
  Release.
- `validate.yml` protects every PR and `main` with Claude validation,
  repository invariants, generated README drift, JavaScript, Markdown, YAML,
  spelling, link, secret, action, shell, and workflow security checks.
- Dependabot updates npm, GitHub Actions, and pre-commit inputs daily and
  auto-merges only after required checks pass.
- `bump-validate-action.yml` vendors and re-pins Anthropic's untagged validator
  daily, opens an automation PR, dispatches validation, and enables auto-merge.
- The dependency audit has a required all-severity pull request gate, a daily
  signal, and a separate daily self-healing `npm audit fix` PR path.
- Releases and automation PRs use short-lived GitHub App tokens with explicit
  permissions. Normal validation remains read-only.
- Root npm packages are development, validation, and release tooling only.
  Shipped plugins have no root-runtime dependency.
- The tracked worktree was clean before this plan was added.

### Claude baseline hashes

The first compiler output must reproduce these current Claude artifacts byte for
byte. Record new hashes only after an intentional future release changes the
canonical version.

| Artifact                                              | SHA-256 at the evidence commit                                     |
|-------------------------------------------------------|--------------------------------------------------------------------|
| `.claude-plugin/marketplace.json`                     | `9824c78c113bb5b2d52b40d1498fb11fc25f809a3fee9c5f697d58671668c621` |
| `plugins/axiom-git/.claude-plugin/plugin.json`        | `d127e398f0785adbdf708210557270075293630d2e65e2656cb1e9dd143cfb2e` |
| `plugins/axiom-versioning/.claude-plugin/plugin.json` | `81d4d39ad0ee3221bfc7df0085d8a58c458f15fcea8d176567b0aa5332ca8d03` |

### Existing Codex compatibility baseline

Codex CLI `0.147.0` was tested with an isolated `CODEX_HOME` against both the
local checkout and `netopsengineer/axiom --ref main`.

The current Claude-only repository already produces this behavior through
OpenAI's documented legacy-compatible marketplace support:

- `codex plugin marketplace add <root> --json` registers marketplace `axiom`.
- `codex plugin list --available --marketplace axiom --json` discovers both
  plugins in marketplace order.
- Codex infers `AVAILABLE` installation and `ON_INSTALL` authentication policy.
- `codex plugin add axiom-git@axiom --json` installs and enables the plugin in
  the isolated cache.
- The installed copy includes the shared skill and the Claude manifest, even
  though no native Codex manifest exists yet.
- The real Codex configuration is not touched when `CODEX_HOME` points to a
  temporary directory.

This baseline is a regression requirement, not the target architecture. Native
Codex output must work without the legacy root catalog, and coexistence with the
Claude catalog must continue to work.

### Existing Claude installation baseline

Claude CLI `2.1.231` was tested with `CLAUDE_CONFIG_DIR` pointing at a unique
temporary directory. The CLI added the local repository marketplace, listed
marketplace `axiom`, installed both plugins, and reported these enabled
user-scope installs at the canonical versions:

- `axiom-git@axiom` at `1.0.0`;
- `axiom-versioning@axiom` at `1.1.1`.

Both install paths remained under the temporary configuration directory. No
model authentication was required, and the real Claude configuration was not
changed. The installed cache contained the expected manifests and shared skill
files. Direct local installation copies working-tree content, so the durable
smoke design below constructs its package fixture only from Git-tracked and
non-ignored files.

### Current platform contracts

The implementation must refresh these sources before writing adapters.

| Contract                           | Verified requirement                                                                                                                                                                       |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Claude marketplace documentation] | The root catalog is `.claude-plugin/marketplace.json`; local sources begin with `./`; the CLI can validate a marketplace and its local plugins.                                            |
| [Claude plugin reference]          | `.claude-plugin/plugin.json` is the Claude manifest; `name` is required; strict validation treats unknown-field warnings as errors.                                                        |
| [Claude environment variables]     | `CLAUDE_CONFIG_DIR` relocates settings, credentials, history, and plugins, which permits a credential-free isolated install smoke without changing real user state.                        |
| [OpenAI plugin packaging]          | The native repo catalog is `.agents/plugins/marketplace.json`; the native plugin manifest is `.codex-plugin/plugin.json`; component paths begin with `./` and stay inside the plugin root. |
| [OpenAI skill documentation]       | Shared skills use directory-format `SKILL.md`; `name` and `description` are required; plugins can distribute the same skill format.                                                        |
| [OpenAI plugin overview]           | Codex CLI has a plugin browser; a new session is required after install before using bundled skills or tools.                                                                              |
| [Codex goal documentation]         | `/goal` keeps one durable objective, expects a validation loop and stopping condition, and can point to a plan file for long instructions.                                                 |

[claude marketplace documentation]: https://code.claude.com/docs/en/plugin-marketplaces
[claude plugin reference]: https://code.claude.com/docs/en/plugins-reference
[claude environment variables]: https://code.claude.com/docs/en/env-vars
[openai plugin packaging]: https://developers.openai.com/plugins/build/plugins
[openai skill documentation]: https://learn.chatgpt.com/docs/build-skills
[openai plugin overview]: https://learn.chatgpt.com/docs/plugins
[codex goal documentation]: https://learn.chatgpt.com/use-cases/follow-goals

### Tooling and dependency evidence

The following evidence was refreshed on 2026-08-14. Refresh it in
Checkpoint 0 and record any delta. Do not silently preserve or silently upgrade.

| Item                                         | Repository state                               | Live state                                                                 | Deployment decision                                                                                         |
|----------------------------------------------|------------------------------------------------|----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `@openai/codex`                              | Exact dev dependency `0.147.0`                 | npm `0.147.0`                                                              | Ship the exact current stable CLI and enforce its installed package contract.                               |
| `@anthropic-ai/claude-code`                  | Validator installs `latest`                    | npm `2.1.232`                                                              | Keep the existing isolated validator strategy; do not add a second root CLI.                                |
| `@biomejs/biome`                             | Installed `2.5.8`                              | npm `2.5.8`                                                                | Ship the current remote-main update.                                                                        |
| `@semantic-release/changelog`                | Installed `7.0.0`                              | npm `7.0.0`                                                                | Ship the native-ES-module major upgrade with the coordinated Node floor.                                    |
| `@semantic-release/git`                      | Installed `11.0.1`                             | npm `11.0.1`                                                               | Ship with the changelog upgrade and test both real release configurations.                                  |
| `conventional-changelog-conventionalcommits` | Exact compatible pin `9.3.1`                   | npm `10.3.0`; compatible v9 line ends at `9.3.1`                           | Pin v9.3.1; v10 render functions silently lose commit groups under the current writer v8 pipeline.          |
| `@semantic-release/npm`                      | Fail-closed local replacement; never invoked   | Registry `13.1.5` pulls vulnerable bundled npm tooling                     | Keep npm publication disabled, require explicit plugin configurations, and require zero raw audit findings. |
| Other direct npm packages                    | Lockfile resolutions inspected                 | Current at the registry on the evidence date                               | Ship current versions.                                                                                      |
| GitHub Actions and pre-commit hooks          | SHA-pinned with release or frozen-tag comments | Releases and tags checked; every current tag resolves to the pinned commit | Ship current pins, including `actions/setup-node@v7.0.0` in the local validator wrapper.                    |

The repository's bundled OSV scanner checked 23 relevant npm, GitHub Action,
and pre-commit coordinates, including `@openai/codex@0.147.0` and
`@anthropic-ai/claude-code@2.1.232`. It reported zero advisories. The separate
Raw `npm audit` and `npm run audit:ci` report zero vulnerabilities at every
severity. The gate permits no threshold, allowlist, or deferred finding.

## Target architecture

### Target tree

```text
.axiom/
  marketplace.json                         # canonical catalog and order
.agents/plugins/marketplace.json           # generated native Codex catalog
.claude-plugin/marketplace.json             # generated Claude catalog
.github/scripts/
  build-marketplaces.mjs                   # build/check CLI
  smoke-claude-marketplace.mjs             # isolated Claude install smoke
  check-codex-marketplace.mjs              # independent static validator
  smoke-codex-marketplace.mjs              # isolated native and coexistence smoke
  prepare-plugin-release.mjs               # canonical version update + regeneration
  lib/marketplace-contract.mjs             # canonical loader, validator, renderers
  lib/marketplace-smoke-fixture.mjs        # clean fixtures and real-state snapshots
  marketplace-contract.test.mjs            # compiler and contract tests
  marketplace-smoke-fixture.test.mjs       # fixture and isolation tests
  prepare-plugin-release.test.mjs           # release preparation tests
plugins/<plugin>/
  .axiom/plugin.json                       # canonical plugin metadata and version
  .claude-plugin/plugin.json               # generated Claude manifest
  .codex-plugin/plugin.json                # generated native Codex manifest
  skills/<skill>/SKILL.md                  # one shared behavioral source
```

Do not add inert JSON Schema files. `schemaVersion`, the repository-owned
validator, fixture tests, and fail-closed unknown-field checks form the
executable canonical contract without another runtime dependency or a second
schema implementation that can drift.

### Ownership matrix

| Data                                                                                                  | Canonical owner                                       | Consumers                                                              |
|-------------------------------------------------------------------------------------------------------|-------------------------------------------------------|------------------------------------------------------------------------|
| Marketplace name, display name, owner, plugin order                                                   | `.axiom/marketplace.json`                             | Both catalog renderers, README generators, repository invariants       |
| Claude marketplace description                                                                        | `platforms.claude` in the canonical root record       | Claude catalog and Claude-facing docs                                  |
| Plugin name, display name, release version, common description, author, repository, license, keywords | `plugins/<plugin>/.axiom/plugin.json`                 | Both manifest renderers, badges, release preparation, invariants       |
| Component paths                                                                                       | `components` in the canonical plugin record           | Codex manifest renderer, Claude default discovery checks, invariants   |
| Claude plugin-entry description and category                                                          | `platforms.claude` in the canonical plugin record     | Claude catalog and Claude-facing docs                                  |
| Codex catalog policy, category, short copy, starter prompts                                           | `platforms.codex` in the canonical plugin record      | Codex catalog, Codex manifest, Codex-facing docs                       |
| Skill activation and execution behavior                                                               | `plugins/<plugin>/skills/<skill>/SKILL.md`            | Claude Code and Codex                                                  |
| Shipped eval scenarios                                                                                | `plugins/<plugin>/skills/<skill>/evals/evals.json`    | Repository gate and generated eval index                               |
| Scored eval provenance                                                                                | Plugin `README.md` `## Eval history`                  | Human and agent reviewers, generated eval index                        |
| Claude vendor JSON                                                                                    | Compiler output                                       | Claude CLI and marketplace users                                       |
| Codex vendor JSON                                                                                     | Compiler output                                       | Codex CLI, ChatGPT desktop local marketplace, later package submission |
| Root README generated blocks                                                                          | Canonical records, eval manifests, and plugin READMEs | Repository visitors                                                    |

### Data flow

```text
.axiom/marketplace.json
        +
plugins/*/.axiom/plugin.json
        |
        +--> compiler --> Claude catalog + Claude manifests
        +--> compiler --> Codex catalog + Codex manifests
        +--> README generators --> badges + eval index + dual install list
        +--> semantic-release prepare --> canonical version --> compiler

skills/*/SKILL.md + evals/evals.json --> both hosts + eval documentation
```

### Non-negotiable invariants

1. A plugin name and release version have exactly one writable metadata source.
2. Claude and Codex vendor JSON is checked in for consumers but never edited by
   hand.
3. A clean canonical build is byte-deterministic and produces no diff.
4. `--check` performs no writes and fails on any missing, stale, extra, or
   malformed generated artifact.
5. Existing Claude catalog and manifest bytes remain identical at initial
   migration.
6. Both catalog outputs contain the same plugin names in the same canonical
   order and resolve each plugin to `./plugins/<plugin>`.
7. Both manifests expose the same canonical name, version, description,
   author, repository, license, and keywords. The Codex manifest explicitly
   exposes the canonical skills component. The byte-preserved Claude manifest
   uses Claude's documented default `skills/` discovery for that same canonical
   directory.
8. Platform-only fields remain namespaced in canonical data and never leak into
   the other strict vendor manifest.
9. All generated paths start with `./`, resolve inside the intended root after
   normalization and canonical filesystem path checks, and reject path
   traversal or escaping symlinks.
10. No generated or shipped file references `dev/`, `node_modules/`, a user
    home, or a path outside its plugin root.
11. Shared `SKILL.md` files remain the only behavioral source. Historical
    provider names in measured results remain accurate; operational prose is
    changed only if a current host incompatibility is proven.
12. Root npm packages remain development-only. Plugin `package.json` files stay
    dependency-free release stubs.
13. Existing required GitHub check names continue to gate auto-merge. Codex
    checks run inside an already-required job instead of depending on an
    unverified external ruleset update.
14. The Claude validator auto-update loop, Dependabot auto-merge loop, audit
    self-healing loop, README generation, and semantic-release loop remain
    enabled.
15. Codex CLI updates enter through the existing daily Dependabot PR path and
    can auto-merge only when native and coexistence smoke tests pass.
16. No CI validation requires Claude, OpenAI, or model credentials. Both CLI
    install smokes isolate their state under unique temporary directories.
17. No publication occurs during implementation or validation.

## Canonical data contract

### `.axiom/marketplace.json`

Create one JSON object with these required fields:

- `schemaVersion`: integer `1`.
- `name`: `axiom`.
- `displayName`: `Axiom`.
- `owner`: the existing owner object, preserved exactly.
- `platforms.claude.description`: the existing Claude marketplace description,
  preserved exactly so initial Claude output retains its hash.
- `plugins`: an ordered array of plugin name strings.

For schema version 1, `owner` permits only required non-blank `name` and valid
`email` strings. Root `platforms` permits only `claude`, and that object permits
only required non-blank `description`. Preserve the current values exactly.

Reject missing fields, blank strings, unknown fields at every object level,
duplicate names, non-kebab names, names without matching directories, and
directories absent from the array.

### `plugins/<plugin>/.axiom/plugin.json`

Create one JSON object per plugin with these required fields:

- `schemaVersion`: integer `1`.
- `name`: kebab-case and equal to the directory name.
- `version`: a valid Semantic Version owned by semantic-release after seeding.
- `displayName`: current plugin display name.
- `description`: current plugin manifest description.
- `author`: current non-empty author object.
- `license`: current SPDX license string.
- `repository`: current repository URL.
- `keywords`: current non-empty, unique string array.
- `components.skills`: exactly `./skills/` for the current plugins.
- `platforms.claude.catalogDescription`: current Claude marketplace entry
  description.
- `platforms.claude.category`: current Claude marketplace category.
- `platforms.codex.category`: `Productivity` for both current plugins. This is
  an official documented local-marketplace category value and avoids inventing
  an unpublished category enumeration.
- `platforms.codex.policy.installation`: `AVAILABLE`.
- `platforms.codex.policy.authentication`: `ON_INSTALL`.
- `platforms.codex.shortDescription`: explicit concise install-surface copy.
- `platforms.codex.defaultPrompt`: a non-empty array of explicit starter
  prompts.

For schema version 1:

- `author` permits only required non-blank `name` and valid `email` strings;
- `components` permits only required `skills`;
- `platforms` requires exactly `claude` and `codex`;
- `platforms.claude` permits only `catalogDescription` and `category`;
- `platforms.codex` permits only `category`, `policy`, `shortDescription`, and
  `defaultPrompt`;
- `policy` requires only `installation` and `authentication`;
- every array contains unique, non-blank strings; and
- repository and any future URL field must be an absolute HTTPS URL without
  embedded credentials.

Render `components.skills` as the native Codex manifest's explicit `skills`
field. Do not add an explicit `skills` field to the initial Claude manifests:
the current byte-preserved manifests rely on Claude's documented default
`skills/` discovery. Validate that the canonical path equals the existing
default directory and that every discovered skill is covered. A later explicit
Claude component field is allowed only after an intentional compatibility
change updates the accepted Claude baseline.

Seed these Codex-only values:

| Plugin             | `shortDescription`                                               | `defaultPrompt`                                                    |
|--------------------|------------------------------------------------------------------|--------------------------------------------------------------------|
| `axiom-git`        | `Compose safe Conventional Commit messages from staged changes.` | `Compose and commit my staged changes safely.`                     |
| `axiom-versioning` | `Verify dependencies with live version and security evidence.`   | `Audit this repository's dependency versions and security status.` |

Derive the native Codex interface as follows:

- `displayName` from canonical `displayName`.
- `shortDescription` from the explicit Codex field.
- `longDescription` from canonical `description`.
- `developerName` from `author.name`.
- `category` from the explicit Codex category.
- `websiteURL` from canonical `repository`.
- `defaultPrompt` from the explicit Codex array.

Do not emit `capabilities`, privacy policy, terms, support, visual assets,
`apps`, `mcpServers`, or `hooks` for the current plugins. Those fields are
optional. Emitting inferred capabilities or nonexistent assets would create a
false public contract. Extend the canonical schema only when a plugin actually
adds and validates such a component.

Reject unknown fields at every canonical object level. Add a new optional field
only with a renderer, validation, positive test, negative test, and documented
ownership rule in the same change.

### Claude adapter rules

Render the Claude catalog with the current `$schema` URL, then `name`,
`description`, `owner`, and `plugins` in that order. Derive `description` from
canonical `platforms.claude.description`. Render each entry with `name`,
plain-string local `source`, `description`, and `category` in current order;
derive the last two fields from the plugin record's `platforms.claude` object.

Render each Claude manifest with the current `$schema` URL, then `name`,
`displayName`, `description`, `version`, `author`, `license`, `repository`, and
`keywords` in current order. Do not add the canonical component field to this
adapter during initial migration. These rules preserve the three baseline
hashes while moving ownership out of Claude-specific files.

### Generated output rules

- Render every output completely in memory before writing any output.
- Validate canonical inputs and all rendered outputs before the first write.
- Capture original bytes, stage every changed output to a uniquely named sibling
  temporary file, and rename only after all staging succeeds. If a commit-phase
  rename fails, restore every already-replaced target from captured bytes,
  remove only transaction-owned temporary files, and report both the original
  and any rollback failure. Inject a mid-commit failure in tests and prove the
  fixture remains byte-identical.
- Use two-space JSON indentation, stable target-specific key order, and one
  final newline.
- Write only files whose bytes changed.
- In check mode, compare exact bytes and report every stale path in one run.
- Do not put generated comments or custom marker fields into strict vendor JSON.
- Detect an obsolete generated manifest for a removed plugin and fail with an
  exact removal instruction. Do not delete it implicitly.
- Export pure load, validate, and render functions so tests can use a temporary
  repository root without changing process-global state.
- Keep build output and error messages deterministic so agents can act on them.

## Checkpoint 0: Refresh contracts and preserve the baseline

Set Checkpoint 0 to `IN_PROGRESS` before taking these actions.

### Required actions

1. Inspect the current worktree and record the starting commit and branch.
2. Re-read the official sources in [Current platform contracts](#current-platform-contracts).
3. Verify the installed `codex` and `claude` command surfaces with `--help` and
   version output. Confirm the marketplace add, list, and plugin add commands
   used by the smoke design still exist.
4. Query the npm registry for current `@openai/codex` metadata, including
   version, tarball, integrity, engines, binary, and repository.
5. Query both GitHub latest release and tags for `openai/codex`. Resolve an
   annotated release tag through to its commit.
6. Run the bundled OSV scanner against every current direct npm dependency, the
   candidate Codex version, the Claude CLI version used for comparison, every
   GitHub Action, and every external pre-commit hook.
7. Run raw `npm audit` and `npm run audit:ci`; require zero vulnerabilities at
   every severity.
8. Re-run the isolated local and remote legacy Codex probes in a temporary
   `CODEX_HOME`. Record names, order, versions, policies, and real-state
   isolation.
9. Re-run the isolated Claude marketplace add and both-plugin install probe with
   `CLAUDE_CONFIG_DIR` under a unique temporary directory. Record marketplace,
   plugin IDs, versions, enabled state, install paths, and real-state isolation.
10. Run the current baseline validation commands listed below.
11. Recompute the three Claude artifact hashes. If they differ from the table,
    explain the current committed difference and use the current clean commit as
    the migration baseline. Do not overwrite a dirty artifact to force a match.

### Baseline commands

```bash
git status --short --branch
npm run check:repo
npm run docs:readme:check
npm run lint
npm run lint:yaml
npm run lint:spelling
npm run lint:links
npm run check:precommit:security
npm run check:plugins:local
npm run test:automation
npm run test:validate-plugins
npm run audit:ci
```

### Dependency decision rule

Select the freshly verified stable `@openai/codex` version for Checkpoint 2.
Record this exact command, but do not run it or edit the lockfile during
Checkpoint 0:

```bash
npm install --save-dev --save-exact @openai/codex@<verified-version>
```

Here, `<verified-version>` means the exact stable version returned by the npm
registry during this checkpoint and corroborated by the official GitHub release
and tag. It is the only permitted unresolved value in this reusable execution
command. Record the replacement in the execution evidence before running it.

If the current stable version is newer than the evidence snapshot, use the
newer stable version after reviewing its release notes, CLI help, integrity,
engine compatibility, and OSV result. Do not ask for a version preference. Do
not upgrade any unrelated dependency in the same install operation.

### Acceptance gate

- Current platform contracts are recorded with retrieval date and source.
- The baseline is either green or every unrelated pre-existing failure is
  recorded precisely.
- The Claude baseline hashes are recorded.
- The isolated Claude install baseline is green and leaves real state unchanged.
- The candidate exact Codex dependency has registry, release, tag, integrity,
  engine, and advisory evidence.
- No tracked file has been edited yet except this execution record if it was
  updated.

## Checkpoint 1: Build the canonical compiler with Claude parity

Set Checkpoint 1 to `IN_PROGRESS` only after Checkpoint 0 passes.

### Required edits

- Add `.axiom/marketplace.json`.
- Add `plugins/axiom-git/.axiom/plugin.json`.
- Add `plugins/axiom-versioning/.axiom/plugin.json`.
- Add `.github/scripts/lib/marketplace-contract.mjs`.
- Add `.github/scripts/build-marketplaces.mjs`.
- Add `.github/scripts/marketplace-contract.test.mjs`.
- Add the marketplace build, check, and test scripts to `package.json`.
- Update `package-lock.json` only through npm.

### Procedure

1. Seed canonical common and Claude fields by parsing the existing catalog and
   manifests. Preserve exact strings, array order, and versions.
2. Make the contract loader accept an explicit repository root for tests.
3. Implement fail-closed validation before render functions.
4. Implement the Claude catalog renderer with current property order and bytes.
5. Implement the Claude plugin renderer with current property order and bytes.
6. Implement `build-marketplaces.mjs` with build mode and read-only `--check`
   mode.
7. Add unit tests for canonical success, every required-field family, unknown
   fields, duplicate plugins, directory mismatch, malformed version, path
   traversal, output ordering, final newline, check-mode drift, and no-write
   check behavior.
8. Run the compiler into memory and compare its Claude bytes to the baseline
   before replacing canonical ownership documentation or release wiring.
9. Run build mode twice. The second run must make no change.

### Package scripts

Add these stable public commands:

```json
{
  "marketplaces:build": "node .github/scripts/build-marketplaces.mjs",
  "marketplaces:check": "node .github/scripts/build-marketplaces.mjs --check",
  "test:marketplaces": "node --test .github/scripts/marketplace-contract.test.mjs .github/scripts/prepare-plugin-release.test.mjs"
}
```

The release test path may not exist until Checkpoint 4. Make
`test:marketplaces` reference only existing test files in each intermediate
commit, then add the release test when its script is added. Ensure root `test`
includes both existing automation tests and marketplace tests by the final
checkpoint.

### Acceptance gate

- Canonical files validate.
- `npm run marketplaces:build` succeeds twice with no second-run diff.
- `npm run marketplaces:check` succeeds and performs no writes.
- Compiler tests pass.
- The three Claude SHA-256 hashes exactly match the migration baseline.
- Current Claude CLI validation still passes.

Do not proceed to native Codex generation until Claude parity passes.

## Checkpoint 2: Generate and validate native Codex artifacts

Set Checkpoint 2 to `IN_PROGRESS` only after Checkpoint 1 passes.

### Required edits

- Change `.gitignore` so only `.agents/plugins/marketplace.json` is re-included
  while other local `.agents` state remains ignored.
- Extend the compiler to generate `.agents/plugins/marketplace.json`.
- Extend the compiler to generate each
  `plugins/<plugin>/.codex-plugin/plugin.json`.
- Add `.github/scripts/smoke-claude-marketplace.mjs`.
- Add `.github/scripts/check-codex-marketplace.mjs`.
- Add `.github/scripts/smoke-codex-marketplace.mjs`.
- Add `.github/scripts/lib/marketplace-smoke-fixture.mjs` and its test.
- Extend marketplace contract tests with Codex cases.
- Add exact `@openai/codex` development tooling and scripts.

Use this `.gitignore` shape instead of broadly re-including `.agents`:

```gitignore
.agents/*
!.agents/plugins/
.agents/plugins/*
!.agents/plugins/marketplace.json
```

Leave `.codex/` ignored.

### Codex catalog renderer

Render:

- top-level `name` from canonical marketplace name;
- `interface.displayName` from canonical marketplace display name;
- one entry per canonical plugin in canonical order;
- entry `name` from canonical plugin name;
- object source `{ "source": "local", "path": "./plugins/<plugin>" }`;
- explicit installation and authentication policy;
- explicit Codex category.

Do not rely on Codex's inferred policies from the legacy catalog.

### Codex manifest renderer

Render:

- common `name`, `version`, `description`, `author`, `repository`, `license`,
  and `keywords`;
- `skills` from the canonical component path;
- the interface fields defined by the canonical derivation rules;
- no undeclared optional component or capability fields.

### Shared clean fixture and isolation contract

Both CLI smoke scripts must use the same repository-owned fixture helper.

- Run `git ls-files` with `--cached`, `--others`, `--exclude-standard`, and
  `-z`, followed by explicit catalog, canonical, and registered plugin path
  arguments. This includes newly generated non-ignored files before a commit
  while excluding ignored scratch.
- Intersect candidates with exact required roots. Reject an absent required
  file, an unexpected plugin directory, an absolute path, traversal, and a
  symlink that resolves outside the source plugin.
- Copy with Node filesystem APIs, not shell interpolation. Preserve executable
  bits where present and use deterministic relative paths.
- Record every `fs.mkdtemp` result in an in-process owned-path set. Cleanup must
  refuse any path outside that set or outside resolved `os.tmpdir()`, and must
  never accept an environment-derived or unresolved cleanup target.
- Build one clean coexistence fixture with both catalogs and both manifests.
  Derive native-only input by omitting only the Claude catalog.
- Snapshot only the documented mutable marketplace registries, settings or
  config files, and plugin cache inventories in the effective real host state.
  Never read, hash, copy, or print credential files or keychain contents.
- Unit-test inclusion of tracked and non-ignored generated files, exclusion of
  ignored scratch, missing required files, path escape rejection, fixture
  determinism, and non-credential state snapshots.

### Isolated Claude CLI smoke validator

Use the `claude` binary installed by the repository's existing validator action
in CI and the current `claude` binary on `PATH` locally. This preserves the
existing self-updating Anthropic CLI strategy instead of creating a second root
Claude dependency.

The smoke script must:

1. Verify the required marketplace add, marketplace list, plugin install, and
   plugin list commands still exist, then record `claude --version`.
2. Create unique fixture and configuration directories with `fs.mkdtemp` under
   `os.tmpdir()`.
3. Build a dual-marketplace fixture from Git-tracked and non-ignored
   working-tree files. Include canonical records, both vendor catalogs, both
   manifests, and each registered plugin's selected package files. Exclude
   ignored scratch by construction.
4. Set `CLAUDE_CONFIG_DIR` to the temporary configuration directory for every
   child. Do not copy credentials or override the user's home.
5. Use the shared helper's non-credential allowlist to snapshot the effective
   real Claude marketplace registry, plugin cache inventory, and mutable
   settings before the run. Assert the same state afterward.
6. Add the fixture root as a marketplace, list marketplaces as JSON, and assert
   marketplace name `axiom` and a resolved path inside the fixture.
7. Install every canonical plugin at user scope. List plugins as JSON and assert
   each canonical ID, version, enabled state, user scope, and install path under
   the temporary configuration root.
8. Inspect every installed cache. Assert the Claude manifest and all canonical
   skill files exist and match fixture bytes. Fail if any registered plugin is
   absent.
9. Use finite child-process timeouts and argument arrays. Include command, exit
   code, stdout, and stderr in failures without printing credentials.
10. Remove only the resolved temporary roots on success. Retain them and print
    their exact paths on failure unless an explicit test-only cleanup flag is
    set.

The smoke must not invoke a model, require authentication, write project or
local scope settings, or accept a partial marketplace.

### Independent static validator

`check-codex-marketplace.mjs` must default to the repository root, accept an
explicit `--root <root>` for temporary fixture tests, remain read-only, and
parse generated files independently of the renderer. It must verify:

- native catalog presence, exact plugin set, order, sources, policies, and
  categories;
- native manifest presence and common-field parity with canonical metadata;
- required `name`, `version`, `description`, and `skills` fields;
- required `name` and `description` in every shared skill frontmatter;
- normalized relative paths with `./` prefix;
- containment after lexical and canonical filesystem resolution;
- no escaping symlink;
- no missing component target;
- no reference to ignored evaluation output or root development tooling;
- no stale native manifest for an unregistered plugin;
- exact generated bytes by invoking check-mode comparison after static
  validation.

The static validator must have negative tests for path traversal, absolute
paths, missing manifests, missing skills, malformed frontmatter, version drift,
policy drift, plugin-order drift, escaping symlinks, and skipped entries.

### Isolated Codex CLI smoke validator

Use the exact `@openai/codex` package installed in `node_modules`. Invoke its
documented JavaScript bin with `process.execPath` and argument arrays. Do not
fall back to an arbitrary global Codex binary in CI.

The smoke script must:

1. Create unique fixture and configuration directories with `fs.mkdtemp` under
   `os.tmpdir()`.
2. Create a `CODEX_HOME` only inside the temporary configuration directory. Do
   not override or write the user's real home.
3. Use the shared helper's non-credential allowlist to snapshot the effective
   real Codex marketplace registry, plugin cache inventory, and mutable config
   before the run. Assert the same state afterward.
4. Build a coexistence fixture from the same Git-tracked and non-ignored file
   selection used by the Claude smoke. Include both catalogs and both manifests.
5. Derive a native-only fixture from the same selected file set by omitting the
   root Claude marketplace. Local `.DS_Store` and other ignored scratch must not
   enter either test package.
6. Run `codex plugin marketplace add <root> --json` in each pass.
7. Run `codex plugin list --available --marketplace axiom --json` and assert the
   canonical plugin names and order.
8. Install every plugin with
   `codex plugin add <plugin>@axiom --json`.
9. List installed plugins and assert each plugin ID, marketplace, installed
   state, and enabled state.
10. Accept the canonical version when the CLI exposes manifest versions. Accept
    the documented `local` sentinel only when the current CLI uses it for local
    native entries. Record which behavior was observed.
11. Inspect each cached plugin and assert that its native manifest and every
    canonical skill file exist and match the source bytes.
12. Fail on a skipped entry instead of accepting a partial marketplace.
13. Remove only the resolved temporary root on success. On failure, print the
    root for diagnosis and retain it unless an explicit test-only cleanup flag
    is set.
14. Parse JSON from stdout, tolerate non-fatal CLI diagnostics on stderr, set a
    finite timeout for each child, and include command, exit code, stdout, and
    stderr in failures without printing credentials.

### Package scripts

Add:

```json
{
  "check:claude:smoke": "node .github/scripts/smoke-claude-marketplace.mjs",
  "check:codex:static": "node .github/scripts/check-codex-marketplace.mjs",
  "check:codex:smoke": "node .github/scripts/smoke-codex-marketplace.mjs",
  "check:codex": "npm run check:codex:static && npm run check:codex:smoke"
}
```

Extend `test:marketplaces` in this checkpoint to include
`.github/scripts/marketplace-smoke-fixture.test.mjs`.

### Acceptance gate

- Native catalog and both native manifests are generated and tracked.
- Native-only and coexistence static checks pass.
- Native-only and coexistence CLI smoke checks discover and install every
  plugin.
- The isolated Claude CLI smoke installs every plugin from the coexistence
  fixture at its canonical version.
- Real Claude and Codex configuration state is unchanged.
- Removing either native manifest, altering a generated field, escaping a path,
  or causing one plugin to be skipped makes a test fail.
- Claude hashes and validation remain unchanged.

## Checkpoint 3: Move repository invariants and documentation generators to canonical input

Set Checkpoint 3 to `IN_PROGRESS` only after Checkpoint 2 passes.

### Repository invariant changes

Update `.github/scripts/check-repo-invariants.mjs` so it validates the target
ownership model rather than treating the Claude catalog as canonical.

It must require:

- one valid canonical root catalog;
- one valid canonical plugin record for every plugin directory;
- exact equality among canonical order, both catalog orders, and plugin
  directories;
- exact source path for both platform catalogs;
- both generated manifests per plugin;
- common metadata and version parity across canonical and generated files;
- existing README, changelog, release stub, release config, skill, eval, and
  eval-history rules;
- no root npm runtime dependency from shipped plugin content;
- explicit workflow permissions exactly as today;
- no hand-authored vendor drift;
- no unexpected file under `.agents/plugins/`.

Do not duplicate renderer logic in the invariant script. It may invoke
`marketplaces:check`, but it must independently verify structural and
cross-artifact invariants so one compiler bug cannot bless itself.

### README generator changes

Update all three README generators to read `.axiom/marketplace.json` and
canonical plugin records directly.

- Badge generation must read the canonical version URL at
  `plugins/<plugin>/.axiom/plugin.json`, use a neutral marketplace presentation,
  and keep the changelog link.
- Eval index generation must state that canonical order comes from
  `.axiom/marketplace.json`; eval scenarios and scored histories remain owned by
  their current files.
- Plugin-list generation must render both platform install commands from the
  same canonical entry.
- Check mode must remain write-free and produce all drift errors in one run.
- A version-only release must not require a root README commit because the
  dynamic badge reads the canonical version from `main`.

Add stable aggregate commands:

```json
{
  "generate": "npm run marketplaces:build && npm run docs:readme",
  "generate:check": "npm run marketplaces:check && npm run docs:readme:check"
}
```

### Future plugin lifecycle

Encode this exact agent workflow in repository invariants and `AGENTS.md`:

1. Create `plugins/<plugin>/` with its canonical `.axiom/plugin.json`, README,
   changelog, release stub, release config, at least one directory-format skill,
   and shipped eval manifest.
2. Add only the plugin name to the ordered root canonical catalog.
3. Run `npm run generate`.
4. Run repository, Claude, Codex, eval, documentation, and release contract
   checks.
5. Never author either vendor catalog or vendor manifest directly.

### Acceptance gate

- Repository invariants pass from canonical input.
- All README generators pass in build and check modes.
- Direct edits to any generated marketplace, manifest, or README block fail a
  drift check.
- Adding a valid fixture plugin requires one root registration and one
  canonical plugin record; both adapters render it automatically.
- Missing skill, eval manifest, README eval history, platform manifest, or
  release file fails with the exact path.

## Checkpoint 4: Make release versioning platform-neutral

Set Checkpoint 4 to `IN_PROGRESS` only after Checkpoint 3 passes.

### Required edits

- Add `.github/scripts/prepare-plugin-release.mjs`.
- Add `.github/scripts/prepare-plugin-release.test.mjs`.
- Update both plugin `release.config.js` files.
- Remove `.github/scripts/sync-plugin-version.mjs` only after every reference is
  replaced and its behavior is covered by the new tests.
- Update release workflow verification without changing its token model,
  concurrency, loop, or per-plugin semantic-release behavior.

### Release preparation contract

The preparation script receives a plugin root and semantic-release's exact next
version. It must:

1. Resolve and verify that the target is exactly one registered directory under
   repository `plugins/`.
2. Parse and validate its canonical plugin record.
3. Update only canonical `version`.
4. Run the full in-memory compiler and validate every result.
5. Use the compiler's transaction writer to write the canonical record and both
   generated manifests as one rollback-protected operation.
6. Assert that neither root marketplace changes during a version-only update.
7. Assert that no other plugin canonical record or manifest changes.
8. Fail before writing if any scope assertion fails.

The release command must call this script from `@semantic-release/exec`
`prepareCmd`.

Each plugin's `@semantic-release/git` assets must be exactly:

```text
.axiom/plugin.json
.claude-plugin/plugin.json
.codex-plugin/plugin.json
CHANGELOG.md
```

Preserve the current release commit message, branches, changelog generation,
GitHub Release, tags, semantic-release-monorepo filtering, and GitHub App token
flow.

### Release tests

Use temporary repository fixtures to prove:

- a patch, minor, major, and prerelease-compatible Semantic Version is written
  consistently;
- invalid versions fail before a write;
- a target outside `plugins/` fails;
- an unregistered plugin fails;
- only the selected plugin's three metadata files change;
- root catalogs remain byte-identical;
- another plugin remains byte-identical;
- both release configs list the required assets and call the preparation
  script;
- generated manifest versions equal the canonical version;
- a failed compiler leaves the fixture unchanged.

Do not make a live release. A semantic-release dry run is optional evidence
because GitHub authentication and branch state can make it unavailable. The
repository-owned release preparation tests are required and must not depend on
credentials.

### Workflow integration

Keep the current `release.yml` loop. After all per-plugin release invocations,
run `npm run marketplaces:check` as a postcondition. Do not add public Codex or
Claude publication steps.

### Acceptance gate

- Release preparation tests pass.
- Both release configs update canonical version and commit both generated
  manifests.
- Per-plugin release scope is preserved.
- Root catalogs do not change on version-only releases.
- Existing changelog, tag, GitHub Release, token, and branch protection behavior
  is preserved.

## Checkpoint 5: Extend CI, pre-commit, and dependency automation

Set Checkpoint 5 to `IN_PROGRESS` only after Checkpoint 4 passes.

### CI integration

Do not depend on a new GitHub ruleset check name. Extend the existing
`validate.yml` job whose visible name is `Plugin manifests`:

1. Keep the pinned local Anthropic validation action and its smoke tests.
2. Run `npm ci --loglevel=error` after the action's Node setup.
3. Run `npm run marketplaces:check`.
4. Run `npm run check:claude:smoke` while the action-provided Claude CLI is on
   `PATH`.
5. Run `npm run check:codex:static`.
6. Run `npm run check:codex:smoke`.

This makes existing required-check and auto-merge behavior cover both platforms
without an external branch-protection edit. Keep the job ID and visible name
unless repository settings are read and prove that a rename is safe. The plan
does not authorize changing those settings.

Keep `npm run generate:check`, JavaScript lint, and marketplace unit tests in an
existing Node-backed required job. Avoid running the expensive setup twice when
one existing job already provides it, but do not remove independent static
checks merely to save seconds.

### Local Claude validation

Extend `validate-local-plugins.mjs` and `check:plugins:local` so local validation
covers the root marketplace and every plugin with current CLI strict behavior.
Keep the existing command name so current hooks and agent instructions do not
break. Keep the isolated install smoke as the separate stable
`check:claude:smoke` command so strict schema failures and installation failures
remain independently diagnosable.

### Pre-commit integration

Update local hooks in this order:

1. Marketplace generation on canonical, platform manifest, compiler, release,
   or relevant plugin changes.
2. Claude strict validation.
3. Claude isolated smoke when either catalog, either manifest, a skill, the
   Claude smoke script, or relevant package selection logic changes.
4. Codex static validation.
5. Codex isolated smoke when Codex catalog, manifests, skills, smoke script,
   `package.json`, or lockfile changes.
6. Repository invariants.
7. Automation and marketplace unit tests.
8. Generated README blocks.
9. Existing YAML, spelling, links, Markdown, secrets, action, shell, and zizmor
   hooks.

Generation hooks may update files and stop the commit for restaging, matching
the current README and formatter behavior. Validation hooks must not write.

### Dependabot and audit integration

- Keep one root npm update block. Rename its `release-tooling` group and comment
  to `repository-tooling` because the group now also contains the Codex CLI.
- Keep the current daily cadence, cooldown, versioning strategy, labels, and
  green-check auto-merge behavior.
- Let Dependabot update exact `@openai/codex` versions. Every such PR must run
  native-only and coexistence smoke tests before auto-merge.
- Keep the Anthropic tagless-validator bump workflow unchanged except for any
  path filters needed by the canonical catalog.
- Keep the audit, audit-fix, SHA pins, action permissions, and App-token scopes
  unchanged.
- Confirm the new lockfile still passes `npm run audit:ci` and the OSV scan.

### Acceptance gate

- Existing required validation covers Claude strict validation, Claude isolated
  installation, Codex static validation, and Codex isolated installation.
- A simulated Codex dependency bump exercises static, smoke, unit, audit, and
  lockfile checks.
- A simulated broken Codex package contract makes the PR gate fail, preventing
  auto-merge.
- Existing Anthropic validator, dependency audit, audit fix, Dependabot, and
  release workflows remain enabled and security lint passes.
- No action pin or permission broadening is introduced.

## Checkpoint 6: Update agent contracts and human documentation

Set Checkpoint 6 to `IN_PROGRESS` only after Checkpoint 5 passes.

### `AGENTS.md`

Make the agent execution contract canonical and concise:

- Change the product description to a Claude Code and Codex plugin marketplace.
- Add the target tree and ownership matrix.
- Mark both vendor catalogs and both vendor manifests generated.
- Make `.axiom/marketplace.json` and per-plugin `.axiom/plugin.json` canonical.
- Preserve semantic-release ownership of canonical version and changelog.
- Replace the plugin-add procedure with the one-registration workflow.
- Add `generate`, `generate:check`, Claude smoke, Codex static, Codex smoke, and
  dual-platform validation commands.
- Preserve all current branch, PR title, security, Markdown, ASCII, eval, and
  release rules.
- State that platform-specific metadata belongs only under the corresponding
  canonical namespace.
- State that public directory publication is an explicit external operation,
  not a release side effect.

Keep `CLAUDE.md` as its current import of `AGENTS.md`; do not duplicate the new
rules. Codex reads `AGENTS.md` directly.

### Root `README.md`

- Describe Axiom as a dual Claude Code and Codex marketplace.
- Keep the empirical quality claim, but distinguish scored behavior evidence
  from deterministic packaging compatibility.
- Add a Codex badge and retain a Claude badge.
- Document both marketplace-add commands.
- State that Codex users install, then start a new session before use.
- Render both platform install commands per plugin in the generated block.
- Show canonical and generated paths in the repository layout.
- Do not hand-edit generated blocks. Change their sources and generators.

### Plugin READMEs

- Replace Claude-only product framing with host-neutral plugin framing.
- Add Claude Code and Codex install and invocation notes where applicable.
- Preserve all historical eval model names, dates, scores, and conclusions
  verbatim unless correcting a proven factual error outside this migration.
- Do not imply that Claude-scored results are Codex-scored results.
- Keep `## Eval history` non-empty.

### `CONTRIBUTING.md`

- Explain canonical input and generated adapters.
- Add exact dual-platform local checks.
- Explain that the exact Codex CLI is root validation tooling, not a shipped
  dependency.
- Update release documentation so semantic-release owns canonical version and
  emits both manifests.
- Update workflow and pre-commit tables without weakening current autonomy.
- Replace the claim that eval review is necessarily human with an evidence
  rule: a capable agent may run and grade evals, but the result must name host,
  model, date, fixtures, score, and comparison baseline.

### `SECURITY.md` and package metadata

- Update Claude-only scope wording where it would falsely exclude Codex catalog
  or native manifest risk.
- Keep the existing disclosure and security boundary.
- Update root `package.json` description to dual-marketplace tooling.

### Markdown and ASCII gates

For every edited Markdown file, run the repository-required table formatter and
markdownlint pass on explicit paths. Run spelling and link checks after all docs
generation. Run the byte-oriented Unicode scan on added or rewritten prose and
classify any preserved non-ASCII in historical content. Do not rewrite
historical emoji or measured source text solely to make old files ASCII.

### Acceptance gate

- Future agents can identify canonical and generated files without inference.
- Human install docs work for both platforms.
- Eval claims accurately name their evidence boundary.
- No generated README block was edited directly.
- Markdown, spelling, links, and Unicode classification pass.

## Checkpoint 7: Preserve and extend eval evidence

Set Checkpoint 7 to `IN_PROGRESS` only after Checkpoint 6 passes.

### Required behavior

1. Do not change current `SKILL.md` operational instructions merely because the
   host name differs. Both current skills already contain required `name` and
   `description`, and the isolated Codex install baseline accepts them.
2. Scan operational skill prose for genuinely provider-bound behavior.
3. Preserve a provider name when the rule is actually provider-specific, when
   it names an evaluated model, or when exact historical provenance matters.
4. Change provider language only when the same instruction must operate on both
   hosts and current Codex testing proves the wording causes a mismatch.
5. If skill prose changes materially, treat it as a plugin behavior change:
   update or add eval scenarios, run the appropriate with-skill and baseline
   comparisons, store run output under `dev/<plugin>/`, and update scored history
   with actual host and model provenance.
6. If skill prose does not change, do not fabricate a new scored eval run.
   Existing quality evidence remains historical; native static and CLI smoke
   tests establish packaging compatibility.
7. Keep shipped eval output out of plugin directories.

### Optional live Codex eval branch

If authenticated non-interactive Codex model execution is already available
without copying or exposing credentials, the executing agent may run the
existing scenarios against Codex and record a new host-specific eval history.
This is additive evidence, not a completion requirement for an unchanged shared
skill. If it is unavailable, record `NOT RUN: no authenticated deterministic
eval environment` and continue. Do not weaken packaging gates or claim a score.

### Public submission readiness report

Document, without blocking repository support, that current public-directory
submission still requires external publisher identity, assets and legal URLs,
portal entry, review, publication, and a portal-ready set of at least five
positive and three negative tests. Do not add empty placeholders or invent those
materials.

### Acceptance gate

- Shared skill source remains singular.
- Every skill is present and byte-matched in each installed Claude and Codex
  cache in the smoke tests.
- Claude validation still passes.
- No existing eval score is relabeled or generalized beyond its evidence.
- Any material skill change has new measured evidence; otherwise no behavior
  file changed.

## Checkpoint 8: Run the full completion gate

Set Checkpoint 8 to `IN_PROGRESS` only after Checkpoints 0 through 7 pass.

### Clean-generation test

1. Run `npm run generate`.
2. Run `npm run generate:check`.
3. Save `git diff --stat` and file hashes.
4. Run `npm run generate` again.
5. Assert the second run does not alter any byte.

### Mutation tests

Use temporary fixtures or restore only agent-created fixture copies after each
case. Do not mutate and restore user files with destructive Git commands.

Prove these failures:

- direct Claude catalog edit;
- direct Codex catalog edit;
- direct Claude manifest edit;
- direct Codex manifest edit;
- canonical description change without generation;
- duplicate canonical plugin;
- unregistered plugin directory;
- registered missing plugin directory;
- missing canonical plugin record;
- missing README eval history;
- missing shipped eval manifest;
- missing skill `name` or `description`;
- Codex path traversal;
- absolute component path;
- escaping symlink;
- partial Claude discovery or installation where one entry is absent;
- partial Codex discovery where one entry is skipped;
- release preparation that changes another plugin;
- release preparation that changes a root catalog;
- exact Codex dependency bump with a deliberately incompatible CLI fixture.

### Final inspection

- Inspect every changed file and every generated diff.
- Confirm no ignored scratch plan became a runtime dependency.
- Confirm no `.DS_Store`, real Codex state, temp directory, credential, audit
  output, or `dev/` run data entered a shipped plugin accidentally.
- Confirm both current plugins install through Claude from the clean
  coexistence fixture and through Codex from the clean coexistence and
  native-only fixtures.
- Confirm the root and plugin docs name both install paths.
- Complete the execution record and final verification report.

## Final validation sequence

Run these commands from the repository root in this order. A later edit must
invalidate and rerun every affected earlier command.

```bash
npm ci --loglevel=error
npm run generate
npm run generate:check
npm run test
npm run test:marketplaces
npm run test:validate-plugins
npm run check:repo
npm run check:plugins:local
npm run check:claude:smoke
npm run check:codex:static
npm run check:codex:smoke
npm run check:codex
npm run docs:readme:check
npm run lint
npm run lint:yaml
npm run lint:spelling
npm run lint:links
npm run audit:ci
npm run check:precommit:security
PR_BRANCH=feat/codex-marketplace npm run check:branch-name
npx prek run --all-files
git diff --check
git status --short --branch
```

For each edited Markdown path, also run these explicit targeted commands before
the broad pre-commit pass:

```bash
npx -y markdown-table-formatter path/to/edited-file.md
npx -y markdownlint-cli2 --fix path/to/edited-file.md
git diff -- path/to/edited-file.md
LC_ALL=C awk '/[^\t\r -~]/ { print FNR }' path/to/edited-file.md
```

Replace `path/to/edited-file.md` with each actual path. The replacement is a
defined per-file replacement token, not a literal command argument. If `npx`
cannot write its cache, rerun only the failed command with the
repository-documented temporary npm cache.

Run the Unicode pre-filter on every changed text file, not only Markdown. Empty
output is a pass for candidate detection. For non-empty output, inspect added or
rewritten spans and classify each candidate under `AGENTS.md`. Report preserved
non-emoji non-ASCII with path, line, column, and preservation basis.

## Completion gates

The goal is complete only when all gates below are true.

### Canonical ownership

- `.axiom/marketplace.json` is tracked and owns order and marketplace identity.
- Every plugin has one tracked `.axiom/plugin.json` owning common metadata,
  platform overrides, and release version.
- Canonical validators reject unknown or inconsistent state.

### Claude preservation

- Claude catalog and manifests are generated.
- Initial migration hashes match the accepted baseline.
- Root and per-plugin strict Claude validation pass.
- The isolated Claude smoke installs every canonical plugin and byte-matches
  its manifest and shared skills without changing real user state.
- Claude installation docs and existing release behavior remain usable.
- Anthropic validator update automation remains active.

### Native Codex support

- `.agents/plugins/marketplace.json` is tracked and generated.
- Every plugin has a generated `.codex-plugin/plugin.json`.
- Static validation passes.
- Native-only and coexistence CLI smoke tests discover and install every plugin.
- Cached native manifests and shared skills match source bytes.
- Real Codex state remains unchanged.
- Exact Codex tooling is Dependabot-managed and dev-only.

### Release and automation

- One canonical version feeds both generated manifests.
- Release preparation cannot alter root catalogs or another plugin.
- Both release configs commit canonical metadata, both manifests, and changelog.
- Existing per-plugin tags, changelog, GitHub Release, concurrency, token, and
  branch-protection flow remains intact.
- Existing required validation gates both platforms.
- Dependabot, audit, audit fix, pre-commit, README generation, and validator bump
  automation remains green.
- No new unpinned action or broadened permission exists.

### Documentation and evidence

- Agent instructions identify every canonical and generated path.
- Root and plugin docs provide both install paths.
- Generated README regions derive only from canonical sources and evidence
  owners.
- Eval provenance remains accurate and provider-specific where measured.
- Public publication is not claimed or performed.
- Markdown, spelling, link, diff, and Unicode checks pass.

### Final repository state

- Every command in the final validation sequence passes, or an explicitly
  permitted optional live eval or semantic-release dry run is reported as not
  run with its exact reason.
- No required check is skipped, waived, unavailable, or failing.
- One full final pass makes no further edit.
- The execution record contains no `IN_PROGRESS`, `PENDING`, or unclassified
  result.
- The final report lists changed files by subsystem, platform behavior proven,
  dependency evidence, validation results, optional checks not run, and any
  remaining external publication boundary.

## Failure recovery

Apply the first matching recovery rule.

| Failure                                                                     | Required recovery                                                                                                                                                                             |
|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Official field or CLI output changed but native marketplace support remains | Update the adapter, parser, fixture, and this plan's execution evidence to the current official contract. Preserve canonical ownership and both-host invariants. Continue.                    |
| Claude output differs from baseline                                         | Diff the rendered object field by field. Fix canonical seeding or Claude key ordering. Do not accept formatting drift merely for convenience.                                                 |
| Claude omits or fails to install one plugin                                 | Treat the partial result as failure. Inspect the catalog entry, manifest, component discovery, and CLI stderr. Add a regression test before continuing.                                       |
| Claude writes outside temporary `CLAUDE_CONFIG_DIR`                         | Stop the smoke process, retain diagnostic paths, restore no file destructively, and redesign isolation. This becomes a blocker if current CLI offers no safe isolation.                       |
| Codex skips one plugin                                                      | Treat partial discovery as failure. Inspect native source, manifest, policy, component path, and CLI stderr. Add a regression test before continuing.                                         |
| Codex writes outside temporary `CODEX_HOME`                                 | Stop the smoke process, retain diagnostic paths, restore no file destructively, and redesign isolation. This becomes a blocker if current CLI offers no safe isolation.                       |
| New exact Codex version breaks smoke                                        | Keep the previous verified exact version, open no external PR, record the incompatibility, and test whether the upstream release documents a migration. Do not auto-merge the broken version. |
| New dependency advisory appears                                             | Open the fetched advisory, verify applicability and fixed versions, and choose a safe exact version. Do not add an allowlist entry merely to finish the migration.                            |
| Generated build partially writes before failure                             | Fix build transaction ordering, regenerate from canonical input, and add a no-partial-write regression test.                                                                                  |
| Release preparation changes a root catalog or another plugin                | Fail closed, restore only the temporary fixture, and correct release scoping before touching live plugin metadata.                                                                            |
| Markdown or formatter changes generated blocks                              | Fix the generator or canonical source, regenerate, then rerun Markdown and drift checks. Do not patch the block directly.                                                                     |
| Historical non-ASCII appears in an edited file                              | Classify unchanged preserved content separately. Fix only agent-authored violations and rerun affected checks.                                                                                |
| Unrelated baseline check fails                                              | Record exact command and output. Continue only if the failure is demonstrably pre-existing and cannot mask a changed-path regression. Required final gates still must pass before completion. |

## Blocking gates

Set the active checkpoint to `BLOCKED` and stop only when all safe repository
checks and recovery paths are exhausted and one of these conditions is proven:

1. Current official OpenAI tooling no longer supports a repository marketplace
   or native skills-only plugin format, so the requested Codex target does not
   exist.
2. Current Claude and Codex contracts require mutually incompatible content in
   the same shared skill, and no platform adapter can preserve one behavioral
   source.
3. Current Codex CLI cannot be isolated from real user state for read-only
   discovery and local installation smoke testing.
4. Current Claude CLI cannot be isolated from real user state for marketplace
   discovery and local installation smoke testing.
5. The official Codex package, release tag, integrity, or security state cannot
   be verified from live primary sources, and no already-verified safe exact
   version supports the required commands.
6. A new blocking advisory affects the required Codex validation path and no
   safe compatible version exists.
7. Existing user changes overlap required files in a way that cannot be merged
   without discarding intent.
8. Required repository credentials or an external write become necessary for a
   completion gate that this plan defines as credential-free and local.

Do not block merely because documentation drifted, a test exposed a bug, an
optional public submission cannot occur, an optional live model eval is
unavailable, or implementation takes multiple turns. Adapt or record the
explicit optional result and continue.

## Execution record

Update this table during `/goal` execution. Use only `PENDING`, `IN_PROGRESS`,
`PASSED`, or `BLOCKED`. Replace the evidence cell with concise commands, hashes,
or artifact paths. Exactly one row may be `IN_PROGRESS`.

| Checkpoint                                 | Status | Execution evidence                                   |
|--------------------------------------------|--------|------------------------------------------------------|
| 0. Contracts and baseline                  | PASSED | See [Checkpoint 0 evidence](#checkpoint-0-evidence). |
| 1. Canonical compiler and Claude parity    | PASSED | See [Checkpoint 1 evidence](#checkpoint-1-evidence). |
| 2. Native Codex artifacts and validation   | PASSED | See [Checkpoint 2 evidence](#checkpoint-2-evidence). |
| 3. Invariants and documentation generators | PASSED | See [Checkpoint 3 evidence](#checkpoint-3-evidence). |
| 4. Platform-neutral release                | PASSED | See [Checkpoint 4 evidence](#checkpoint-4-evidence). |
| 5. CI, pre-commit, dependency automation   | PASSED | See [Checkpoint 5 evidence](#checkpoint-5-evidence). |
| 6. Agent and human documentation           | PASSED | See [Checkpoint 6 evidence](#checkpoint-6-evidence). |
| 7. Eval evidence preservation              | PASSED | See [Checkpoint 7 evidence](#checkpoint-7-evidence). |
| 8. Full completion gate                    | PASSED | See [Checkpoint 8 evidence](#checkpoint-8-evidence). |

### Checkpoint 0 evidence

- Starting state: `main` at
  `aa7d9e08a22649e74f7ea0c2a14b5189bff2c80e`; the only initial worktree
  entry was untracked `PLAN.md`.
- Contracts retrieved 2026-08-13: [OpenAI plugin packaging],
  [OpenAI skill documentation], [OpenAI plugin overview],
  [Codex goal documentation], [Claude marketplace documentation],
  [Claude plugin reference], and [Claude environment variables]. The native
  and Claude repository marketplace targets remain supported. Current Claude
  unknown-field behavior is warning by default and fail-closed under the
  repository's required `--strict` validation.
- CLI surfaces: `codex-cli 0.147.0` and Claude Code `2.1.232`; both expose the
  marketplace add/list, available-plugin list, and plugin-install commands
  required by the smoke design.
- Codex dependency: npm latest `@openai/codex@0.147.0`, Node engine `>=16`,
  JavaScript bin `bin/codex.js`, registry integrity
  `sha512-EQLEXecAG2ptxI7UpBMo2TR/ga5596/c/OsYF/0LoUDh5JANZ7IoGqlzBEWbuEVQ76JePIbtTW/ihCkp1a7Z3w==`,
  GitHub release and annotated tag `rust-v0.147.0`, release commit
  `be6e8eac029b183056b7e4402879f15d2c85f61b`. A downloaded tarball matched
  the registry integrity. Checkpoint 2 command:
  `npm install --save-dev --save-exact @openai/codex@0.147.0`.
- Shipped dependency deltas: remote Biome `2.5.8`,
  `@semantic-release/changelog@7.0.0`, `@semantic-release/git@11.0.1`, and the
  exact compatible `conventional-changelog-conventionalcommits@9.3.1` pin. The
  coordinated release upgrade raises the Node floor to
  `^22.22.2 || >=24.15`.
- Security: the bundled OSV scanner reported zero advisories for 23 npm,
  Claude comparison, GitHub Action, and pre-commit coordinates. The unused
  default npm publisher was replaced with a fail-closed local package; raw
  `npm audit` and `npm run audit:ci` both report zero vulnerabilities.
- Claude baseline hashes:
  `.claude-plugin/marketplace.json`
  `9824c78c113bb5b2d52b40d1498fb11fc25f809a3fee9c5f697d58671668c621`;
  `axiom-git` manifest
  `d127e398f0785adbdf708210557270075293630d2e65e2656cb1e9dd143cfb2e`;
  `axiom-versioning` manifest
  `81d4d39ad0ee3221bfc7df0085d8a58c458f15fcea8d176567b0aa5332ca8d03`.
- Legacy Codex probes: isolated local and `netopsengineer/axiom --ref main`
  marketplaces discovered `axiom-git` `1.0.0` then `axiom-versioning` `1.1.1`
  with `AVAILABLE` installation and `ON_INSTALL` authentication, installed
  both enabled, and left the real Codex state snapshot unchanged.
- Claude probe: isolated `CLAUDE_CONFIG_DIR` added marketplace `axiom`,
  installed both canonical plugin IDs at user scope with their canonical
  versions and enabled state, kept install paths under the temporary root, and
  left the real Claude state snapshot unchanged.
- Baseline validation passed: `check:repo`, `docs:readme:check`, `lint`,
  `lint:yaml`, `lint:spelling`, `lint:links`, `check:precommit:security`,
  `check:plugins:local`, `test:automation`, `test:validate-plugins`, and
  `audit:ci`.

### Checkpoint 1 evidence

- Added `.axiom/marketplace.json` and one `.axiom/plugin.json` for each
  registered plugin. Canonical validation is fail-closed for required and
  unknown fields, names, versions, nested platform metadata, plugin-directory
  equality, component paths, and canonical filesystem containment.
- Added pure explicit-root load, validate, and Claude render functions plus a
  deterministic build/check CLI. Exact comparison reports every stale output;
  check mode performs no writes.
- Added a sibling-staged output transaction with rollback. An injected
  mid-commit failure test proves the fixture returns byte-for-byte to its
  original file and directory tree.
- `npm run test:marketplaces`: 15 passed, including required-field families,
  unknown fields at every canonical object level, duplicate registration,
  directory mismatch, malformed Semantic Version, path traversal, escaping
  symlink, output order, final newline, aggregate drift, no-write check,
  idempotence, obsolete output guidance, and rollback.
- `npm run marketplaces:build` passed twice with no changed output;
  `npm run marketplaces:check`, `npm run lint`, and
  `npm run check:plugins:local` passed.
- Claude bytes remained unchanged at the three Checkpoint 0 hashes.

### Checkpoint 2 evidence

- Installed exact development dependency `@openai/codex@0.147.0` with
  `npm install --save-dev --save-exact @openai/codex@0.147.0`. No unrelated
  dependency was upgraded.
- Extended the compiler with deterministic native Codex catalog and manifest
  adapters. Added the independent native static validator, isolated Claude and
  Codex smoke validators, and their shared clean-fixture and state-isolation
  helper.
- Temporary Git fixture evidence passed with Claude Code `2.1.232` and exact
  Codex CLI `0.147.0`. Claude coexistence and Codex coexistence plus native-only
  passes each discovered and installed both canonical plugins. Installed
  manifests and selected skill files matched fixture bytes. Both real-state
  snapshots remained unchanged.
- Generated `.agents/plugins/marketplace.json` and both registered plugins'
  `.codex-plugin/plugin.json` files after explicit user approval. Build mode is
  idempotent and exact-byte check mode passes without writes.
- Fixture and static negative coverage passes for tracked and non-ignored file
  selection, ignored scratch exclusion, absent required files, unexpected
  plugin directories, absolute and traversal paths, escaping symlinks,
  deterministic copies, credential exclusion, unowned cleanup, missing native
  manifests and skills, malformed frontmatter, metadata and policy drift,
  plugin order drift, skipped entries, and stale native manifests.
- `npm run test:marketplaces` passed all 37 tests. `npm run lint`,
  `npm run marketplaces:check`, `npm run check:codex:static`, and
  `npm run check:plugins:local` passed.
- Repository-source smoke evidence passed: Codex coexistence and native-only
  installs reported canonical versions and installed both plugins; Claude
  coexistence installed both plugins at canonical versions. Both smokes left
  real state unchanged.
- The three Claude artifact hashes remain identical to the Checkpoint 0
  baseline.

### Checkpoint 3 evidence

- Reworked repository invariants around `.axiom/marketplace.json` and each
  canonical plugin record. Independent checks cover both catalog orders and
  sources, both manifests, common metadata and versions, skills, evals, README
  history, release files, package runtime independence, workflow permissions,
  generated drift, and the exact `.agents/plugins` contents.
- Added 11 invariant tests. A one-registration future-plugin fixture renders
  both adapters automatically. Exact-path failures cover missing skills, evals,
  README history, either vendor manifest, and release wiring; additional tests
  cover vendor drift, unexpected native files, runtime dependencies, and
  workflow permissions.
- Migrated all three root README generators to canonical order and plugin
  metadata. Version badges read `plugins/<plugin>/.axiom/plugin.json`, use a
  host-neutral presentation, and keep changelog links. The eval index names the
  canonical source. Plugin entries render both Claude Code and Codex install
  commands.
- Added `npm run generate` and `npm run generate:check`. Generation was
  idempotent, check mode was write-free, and all README checks passed. An
  injected README marker-block edit made the targeted drift check fail before
  restoration and a green rerun.
- Updated the agent plugin-add lifecycle to one canonical root registration,
  one canonical plugin record, generation, dual-host validation, and no direct
  vendor-file authorship.
- `npm run check:repo`, `npm run generate:check`, `npm run lint`, and all 48
  marketplace tests passed.

### Checkpoint 4 evidence

- Added `prepare-plugin-release.mjs`. It resolves exactly one registered plugin,
  validates the next canonical version, proves root catalogs and every other
  plugin remain unchanged, and transactionally writes only the selected
  canonical record plus its Claude and Codex manifests.
- Added 10 release tests covering patch, minor, major, and prerelease versions;
  invalid versions; outside and unregistered targets; exact three-file scope;
  root and other-plugin byte preservation; compiler failure; injected
  transaction rollback; and both real release configurations.
- Both plugin release configurations call the platform-neutral preparation
  script and commit exactly `.axiom/plugin.json`, both vendor manifests, and
  `CHANGELOG.md`. Changelog generation, commit messages, monorepo filtering,
  branches, tags, and GitHub Release plugins remain unchanged.
- Removed the fully unreferenced `sync-plugin-version.mjs`. The release workflow
  retains its token, loop, concurrency, and permissions model and now runs
  `npm run marketplaces:check` after all plugin release invocations.
- Live npm and installed documentation confirmed `@semantic-release/exec`
  `7.1.0` is current and supports templated `prepareCmd`; installed
  `semantic-release` `25.0.9` matches the current registry version. The current
  changelog, git, and conventional-commits helpers are installed and covered by
  release configuration tests.
- All 58 marketplace tests, `npm run lint`, `npm run lint:yaml`,
  `npm run check:repo`, and `npm run marketplaces:check` passed.

### Checkpoint 5 evidence

- Extended the existing required `Plugin manifests` workflow job after the
  pinned local validator with dependency installation, generated-artifact
  drift, isolated Claude smoke, Codex static, Codex smoke, and validator-action
  smoke gates. The existing `JavaScript` job now checks aggregate generation,
  lint, automation tests, and marketplace tests. Existing job names, explicit
  read-only permissions, triggers, and pinned actions remain unchanged.
- Extended local pre-commit coverage in fail-fast order from canonical
  generation through strict Claude validation, both host smokes, Codex static
  validation, repository invariants, automation tests, generated README drift,
  YAML, spelling, and links. Existing actionlint, shellcheck, zizmor,
  markdownlint, and secret scanning remain enabled.
- Kept the daily npm Dependabot cadence, cooldown, version strategy, labels,
  validator bump, audit signal, and audit-fix loop. Dependabot auto-merge now
  runs on a trusted schedule under the repository GitHub App so its merge
  triggers main-branch workflows. The
  npm group is now named `repository-tooling` and owns the exact
  `@openai/codex` development dependency alongside release tooling.
- Added automation contract tests for workflow command order, hook order and
  triggers, Dependabot ownership, and preservation of autonomous update loops.
  Added an installed Codex package-contract gate and temporary negative
  fixtures that reject an incompatible `bin.codex` mapping or missing binary.
- Live supply-chain verification covered 23 direct npm, Claude comparison,
  GitHub Action, and pre-commit coordinates and found zero OSV advisories.
  Raw `npm audit` and `npm run audit:ci` passed with zero vulnerabilities at
  every severity. Current release helper versions and the validator wrapper's
  `actions/setup-node@v7.0.0` pin are included in the deployment.
- All 61 marketplace tests and 36 automation tests passed. Strict Claude
  marketplace and plugin validation, Claude `2.1.232` isolated installation,
  exact Codex `0.147.0` static and coexistence/native-only installation,
  validator smoke tests, `generate:check`, `check:repo`, `lint`, `lint:yaml`,
  and `check:precommit:security` passed. Both host smokes left real state
  unchanged.

### Checkpoint 6 evidence

- Updated `AGENTS.md` with the dual-host target tree, ownership matrix,
  canonical and generated boundaries, namespaced host metadata, one-registration
  plugin flow, platform-neutral release ownership, dual validation commands,
  and explicit external publication boundary. `CLAUDE.md` remains the unchanged
  import of this canonical agent contract.
- Updated the root README with Claude Code and Codex badges, both marketplace
  add commands, the Codex new-session requirement, canonical and generated
  layout, and an explicit boundary between scored behavior evidence and
  deterministic packaging compatibility. Generated blocks were changed only
  through their canonical sources and generators and pass drift checks.
- Updated both plugin READMEs with host-neutral product framing, both install
  paths, Codex session guidance, and invocation notes. Their complete
  `## Eval history` spans remained byte-identical: `axiom-git`
  `45db731d2c10c46b2a98f2e332e1fd56865d4bc8d12bee8c88086d9e8ee7e127`
  and `axiom-versioning`
  `7e8fab44ec2d700542b91d4afa6cc1161c563dc295c0fe9977222737f559de7b`.
- Updated contributor documentation for canonical inputs, generated adapters,
  exact dual-host local checks, root-only Codex tooling, platform-neutral
  release preparation, autonomous workflow preservation, and host/model/date/
  fixture/score/baseline evidence requirements. Updated security scope and the
  root tooling description without changing the disclosure boundary.
- Targeted table formatting and markdownlint passed for every edited Markdown
  file. `generate:check`, `check:repo`, `lint`, `lint:spelling`, and
  `lint:links` passed. The Unicode scan found no newly authored non-ASCII prose;
  remaining candidates are permitted emoji or unchanged preserved historical
  and repository-policy text.

### Checkpoint 7 evidence

- Scanned both operational skills, their references, and bundled scripts for
  provider-bound language. Remaining provider names are exact operational tool
  tokens, an evaluated `.claude/` classification example, or historical model
  provenance. No current Codex packaging or installation test proves a behavior
  mismatch, so the shared operational source was preserved.
- `git diff --exit-code` passed for both plugin skill trees and `dev/`. The two
  `SKILL.md` hashes remain
  `4d91031c61a823be4e64dca55666c00780192c3bb430f30286d7ea57c2a59226`
  for `commit-message` and
  `4c98620b092a58bcf1061583bb305a466fc97ac2bd76fca948214baa0228e152`
  for `dependency-versions`. Shipped eval manifests remain unchanged at 13
  scenarios and 64 expectations.
- The plugin eval-history spans remained at their Checkpoint 6 hashes. No
  existing Claude result was generalized to Codex and no scored result was
  fabricated. `NOT RUN: no authenticated deterministic eval environment` for
  the optional live Codex model branch; unchanged shared skills do not require
  it.
- Contributor documentation records that public-directory submission still
  requires verified publisher identity, listing assets, legal and support URLs,
  portal entry, review, an explicit publish action, and a portal-ready set of at
  least five positive and three negative tests. No placeholder or publication
  action was added.
- Strict Claude validation and isolated Claude `2.1.232` installation passed.
  Codex `0.147.0` static validation and coexistence/native-only installation
  passed. Both installs byte-matched selected shared skill files and left real
  state unchanged. All 61 marketplace tests, `generate:check`, `check:repo`,
  Markdown, spelling, links, and Unicode classification passed.

### Checkpoint 8 evidence

- Clean generation passed. `npm run generate`, `generate:check`, and a second
  `generate` produced no byte change. Final generated SHA-256 values are Codex
  catalog `7cf6f6a9eb68c5f46a369a5a3a75aa4bf0dc3984d2b5fd910b955f9c72eb5579`,
  `axiom-git` Codex manifest
  `0c5f3e9d4c60f4f69c567f38b9fb33b8616dbf7fcf99df8617a6e8def8e950c7`,
  `axiom-versioning` Codex manifest
  `f11887cfd1d7f2b5412a1dd5220e3f3e4326b4847aa54eaea14060df851dee92`,
  and root README
  `94ce57e68bb279fe197799b57139397f6bfe8b3287e759037a7f6ed9de2f29c5`.
  The three Claude artifacts remain at their Checkpoint 0 hashes.
- All 73 marketplace tests passed. Temporary mutation fixtures explicitly
  reject direct edits to either catalog or either manifest, stale canonical
  descriptions, duplicate and missing registrations, unregistered directories,
  missing canonical records, README history, evals, skill metadata, unsafe and
  escaping paths, partial Claude installation and Codex discovery, release
  scope changes to a root catalog or another plugin, and an incompatible Codex
  package mapping. Fixture cleanup and transaction rollback remained green.
- Final inspection found no skill or `dev/` diff, runtime dependency, ignored
  plan reference, credential, audit output, temporary file, or real host state
  in shipped artifacts. Existing ignored `.DS_Store` files remain user-owned,
  untracked, excluded from package fixtures, and unchanged. No scratch file was
  deleted or promoted.
- The complete final validation sequence passed in the required order:
  dependency installation, generation twice, 36 automation tests, 73
  marketplace tests, three validator smokes, repository invariants, strict
  Claude validation, isolated Claude and Codex installs, generated README
  checks, JavaScript and YAML lint, spelling, links, the governed npm audit,
  security hooks, branch-name validation, every broad pre-commit hook, diff
  whitespace, and final status inspection.
- Unicode validation found no newly authored non-ASCII violation. Permitted
  emoji remain in commit examples and historical evidence. Preserved non-emoji
  candidates are existing repository-policy, disclosure, plugin description,
  and byte-locked historical eval prose; the final report lists their exact
  locations and preservation basis.
- `NOT RUN: no authenticated deterministic eval environment` for the optional
  live Codex model eval. `NOT RUN: semantic-release dry run requires branch and
  GitHub release context not established for this local migration`; the required
  12 release preparation and configuration tests passed without credentials.
- No commit, push, pull request, release, workspace publication, public
  directory submission, credential change, or external write was performed.

## Final report contract

When every gate passes, return a final report with these fields:

- `Outcome`: state that native Claude Code and Codex repository marketplaces are
  generated from one canonical source.
- `Architecture`: list canonical sources, generated outputs, validators, and
  release data flow.
- `Claude evidence`: exact CLI version, baseline hash result, strict validation
  result, isolated install result, installed plugin IDs, and real-state
  isolation result.
- `Codex evidence`: exact CLI version, native-only result, coexistence result,
  installed plugin IDs, and real-state isolation result.
- `Automation evidence`: CI gate, pre-commit, Dependabot, audit, validator bump,
  README generation, and release preparation results.
- `Dependency evidence`: registry, release, tag, integrity, OSV, npm audit, and
  deliberate unrelated-version decisions.
- `Eval evidence`: whether behavior files changed, which scored runs were
  preserved or added, and the exact host/model boundary.
- `Validation`: every required command and result.
- `Optional checks not run`: only allowed live model eval or semantic-release
  dry-run entries, with exact reason.
- `External boundary`: state that no commit, push, release, workspace publish,
  or public directory submission was performed.
- `Execution record`: confirm every checkpoint is `PASSED`.

Do not declare the goal complete while any required command, artifact,
classification, or checkpoint remains unresolved.
