# Dual Marketplace Deployment Plan

Status: APPROVED - DEPLOYMENT IN PROGRESS

Repository: `netopsengineer/axiom`

Evidence date: 2026-08-14

## Objective

Deploy the canonical dual-marketplace migration through a protected pull
request, exercise the final repository through Claude Code and Codex, monitor
release and maintenance automation, recover from partial failures without
rewriting published history, and stop only when every required green-state
condition passes.

This plan deploys repository marketplaces only. It does not submit either
plugin to Anthropic's public marketplace, an OpenAI workspace, or OpenAI's
universal public Plugins Directory.

## Execution authority

The operator authorized the repository deployment end to end on 2026-08-14,
including branch creation, fixes, commit, push, pull request, protected merge,
workflow dispatches, release monitoring, and fix-forward pull requests needed
to reach green. This authority does not cover public-directory submission,
OpenAI workspace publication, or destructive tag and release changes.

Do not deploy directly from a dirty `main` branch. Do not force-push, delete a
tag, move a tag, delete a GitHub Release, bypass a required check, bypass a
pre-commit hook, or hand-edit a generated marketplace artifact.

## Required context

Read these files before starting:

1. `AGENTS.md`
2. `PLAN.md`
3. `package.json`
4. `.github/workflows/validate.yml`
5. `.github/workflows/release.yml`
6. `.github/dependabot.yml`
7. `.pre-commit-config.yaml`
8. Both `plugins/*/release.config.js` files

Treat `PLAN.md` as completed implementation evidence. Treat this file as the
deployment and operational contract.

## Runtime values

Resolve and record these values during execution. Do not continue while a value
is blank, malformed, or inferred:

| Name                  | Required form                          | Resolution point                          |
|-----------------------|----------------------------------------|-------------------------------------------|
| `DEPLOY_BASE_SHA`     | 40 lowercase hexadecimal characters    | Remote `main` before the final rebase     |
| `DEPLOY_BRANCH`       | `feat/native-codex-marketplace`        | Before the first deployment commit        |
| `DEPLOY_PR`           | Positive decimal pull request number   | After pull request creation               |
| `DEPLOY_PR_SHA`       | 40 lowercase hexadecimal characters    | Final checked pull request head           |
| `DEPLOY_MERGE_SHA`    | 40 lowercase hexadecimal characters    | Immediately after merge                   |
| `DEPLOY_RELEASE_RUN`  | Positive decimal GitHub Actions run ID | Release run for the merge                 |
| `DEPLOY_VALIDATE_RUN` | Positive decimal GitHub Actions run ID | Final-main validation dispatch            |
| `DEPLOY_FINAL_SHA`    | 40 lowercase hexadecimal characters    | Remote `main` after release stabilization |
| `DEPLOY_CANARY_ROOT`  | Absolute path returned by `mktemp -d`  | Before production-tree canaries           |

Validate every recorded SHA against GitHub before using it as evidence.

## Current readiness assessment

### Ready evidence

- The completed implementation record reports every checkpoint passed.
- A disposable clone of current remote `main` accepted the complete local delta
  through a three-way apply without conflict.
- The integrated clone retained remote Biome `2.5.8` and the current vendored
  validator pin.
- The integrated clone passed:

    - `npm ci --loglevel=error`;
    - `npm run generate:check`;
    - 27 automation tests;
    - 73 marketplace tests;
    - `npm run check:repo`;
    - strict local Claude marketplace and plugin validation;
    - Claude Code `2.1.232` isolated install smoke;
    - Codex CLI `0.147.0` static validation;
    - Codex coexistence and native-only isolated install smokes;
    - the vendored validator's three fixture tests;
    - JavaScript, YAML, spelling, and link lint;
    - the all-severity npm audit gate;
    - actionlint, shellcheck, and zizmor;
    - `PR_BRANCH=feat/native-codex-marketplace npm run check:branch-name`;
    - `git diff --check`.

- Both host smokes left the real host state unchanged.
- OSV reported no advisories for the 23 current direct npm, GitHub Action, and
  pre-commit coordinates.
- Every GitHub Action and pre-commit SHA resolved to its recorded tag.
- `@openai/codex@0.147.0` remained the current stable npm version and its
  registry integrity matched `package-lock.json` on the evidence date.
- The actual deployment branch matched `origin/main` at
  `e3170f9eb4c68babeb857dbe04a55cabbd031f99` before its first commit and passed
  the complete clean-install and pre-commit parity gate without further edits.
- Both authenticated semantic-release dry runs passed against a disposable
  commit containing the exact deployment delta. They predicted
  `axiom-git` `1.1.0` and `axiom-versioning` `1.2.0`, verified GitHub access,
  and performed no publish step.
- Exact-version release preparation in that disposable repository changed only
  each plugin's canonical record and two generated vendor manifests, after
  which `npm run generate:check` remained green.
- The active `main` ruleset required these checks:

    - `Branch name`;
    - `Plugin manifests`;
    - `Markdown lint`;
    - `JavaScript lint`;
    - `Conventional Commit title`;
    - `Secret scan`;
    - `Repository checks`;
    - `Workflow security lint`.

- A Release run on 2026-08-14 successfully minted the GitHub App token and
  completed the existing release loop. Secret and variable names were not
  readable with the audit identity; the successful token-mint step is the
  available credential evidence.

### Remaining execution gates

No pre-push readiness blocker remains. Continue through the protected pull
request, merge, release, production-install, behavior, and scheduled-automation
phases below. Packaging evidence does not replace authenticated post-install
behavior canaries in new Claude Code and Codex sessions.

## Deployment state model

Use exactly one state at a time:

| State                 | Entry condition                                       | Exit condition                                      |
|-----------------------|-------------------------------------------------------|-----------------------------------------------------|
| `PREPARING`           | Deployment work starts                                | Actual branch is rebased and fully validated        |
| `PR_VALIDATING`       | Pull request exists                                   | All required and advisory checks pass               |
| `READY_TO_MERGE`      | PR is current with `main`; release dry runs agree     | Authorized squash merge completes                   |
| `RELEASING`           | Merge reaches `main`                                  | Release automation stabilizes                       |
| `FINAL_VALIDATING`    | Release automation is terminal                        | Final-main validation and remote canaries pass      |
| `BEHAVIOR_EXERCISING` | Both hosts install from final `main`                  | Required scenario matrix passes                     |
| `OBSERVING`           | Immediate checks are green                            | Scheduled automation window passes                  |
| `GREEN`               | Every completion gate passes                          | Terminal state                                      |
| `RECOVERING`          | A required gate fails after merge                     | Fix-forward returns to the failed state's gate      |
| `BLOCKED`             | Required access, authority, or external service lacks | Dependency is supplied and the failed gate is rerun |

Never skip from `PR_VALIDATING` to `GREEN`.

## Phase 0: Reconcile the deployment branch

1. Record the local state without changing it:

   ```bash
   git status --short --branch
   git rev-parse HEAD
   gh api repos/netopsengineer/axiom/commits/main --jq .sha
   ```

2. Create `feat/native-codex-marketplace` while preserving the current working
   tree.
   Use the repository commit-message workflow and obtain its required commit
   confirmation. Use this squash and release intent:

   ```text
   feat: add native Codex marketplace support
   ```

3. Fetch remote `main`, record its exact head as `DEPLOY_BASE_SHA`, and rebase
   the feature commit onto it. Preserve all unrelated remote changes.

4. Confirm that the rebase retained the latest remote validator source pin and
   current repository-tooling versions. In particular, do not restore Biome
   `2.5.7` over the remote `2.5.8` update.

5. Inspect the post-rebase delta:

   ```bash
   git status --short --branch
   git diff --stat origin/main...HEAD
   git diff --check origin/main...HEAD
   git log --format='%h %s' --decorate origin/main..HEAD
   ```

6. Stop if the rebase introduces a conflict, drops an intended file, adds an
   unrelated file, changes either skill tree, changes `dev/`, or changes a
   generated artifact without its canonical input.

### Phase 0 acceptance

- Branch is exactly `feat/native-codex-marketplace`.
- Branch is based on the then-current remote `main`.
- The intended migration is one reviewable deployment delta.
- No conflict marker or whitespace error remains.
- Remote dependency and validator updates are preserved.

## Phase 1: Re-run the actual-branch completion gate

Run these commands in order from the repository root:

```bash
npm ci --loglevel=error
npm run generate
npm run generate:check
npm run test
npm run check:repo
npm run check:plugins:local
npm run check:claude:smoke
npm run check:codex
npm run test:validate-plugins
npm run lint
npm run lint:yaml
npm run lint:spelling
npm run lint:links
npm run audit:ci
npm run check:precommit:security
PR_BRANCH=feat/native-codex-marketplace npm run check:branch-name
npx prek run --all-files
git diff --check
git status --short --branch
```

After `npm run generate`, inspect the diff before continuing. Generation must
be idempotent and must not reveal an omitted canonical edit.

### Phase 1 acceptance

- Every command exits zero.
- The generated second pass makes no change.
- Raw `npm audit` and the repository gate both report zero vulnerabilities at
  every severity.
- Claude and Codex smoke output names both plugins and reports real state
  unchanged.
- `git status` contains only the intentional deployment delta.

## Phase 2: Refresh volatile contracts

Perform this phase on the day the branch is pushed.

1. Re-read the official Claude marketplace, Claude plugin manifest, OpenAI
   plugin packaging, and OpenAI plugin usage documentation.
2. Query npm for every direct development dependency's current version.
3. Query both the latest release and tags for every GitHub Action and
   pre-commit repository.
4. Resolve each recorded action and hook tag to its commit SHA. Resolve
   annotated tags to their underlying commit.
5. Run one OSV batch for all relevant npm, GitHub Action, validator, and
   pre-commit coordinates.
6. Compare `@openai/codex` registry integrity with the lockfile.
7. Run `npm run audit:ci` again if any registry metadata changed during the
   refresh.

### Dependency decisions

- Ship the remote Biome `2.5.8` patch already present on `main`.
- Ship `@semantic-release/changelog@7.0.0` and
  `@semantic-release/git@11.0.1` as a coordinated native-ES-module upgrade.
  Raise the repository Node floor to `^22.22.2 || >=24.15` and exercise both
  real release configurations plus both semantic-release dry runs.
- Pin `conventional-changelog-conventionalcommits@9.3.1`, the newest compatible
  release. Version 10 replaces Handlebars partials with render functions while
  the current release-notes generator uses writer version 8; that combination
  silently emits headings without commit groups. Require feature, fix, scoped,
  breaking-header, and breaking-footer note fixtures before changing the pin.
- Replace semantic-release's unused default npm-publish plugin with the
  repository-owned fail-closed package. Require explicit per-plugin release
  configurations, prove they exclude npm publication, and require raw
  `npm audit` to report zero vulnerabilities.
- Ship the current `actions/setup-node@v7.0.0` commit in the local validator
  wrapper. Keep the pin under automation contract tests.
- Record and remediate every new delta before continuing. Do not defer or
  allowlist a deployment finding.

### Phase 2 acceptance

- Every external version and platform claim has live evidence.
- OSV reports no relevant advisory that remains to be reviewed.
- Every action and hook remains SHA-pinned.
- Any new delta has an explicit ship or block decision.

## Phase 3: Push, open, and validate the pull request

This phase requires external-write authority.

1. Push `feat/native-codex-marketplace` without force.
2. Open a draft pull request into `main`.
3. Set the pull request title to:

   ```text
   feat: add native Codex marketplace support
   ```

4. Record the pull request number as `DEPLOY_PR` and its head as
   `DEPLOY_PR_SHA`.
5. Watch all checks. Require the eight ruleset checks plus CodeQL to pass.
6. Inspect every skipped or cancelled job. Treat a required job that did not
   execute as a failure, even if GitHub presents the aggregate workflow as
   green.
7. Confirm the `Plugin manifests` job ran these gates in order:

   - strict Claude validation;
   - npm dependency installation;
   - generated marketplace drift;
   - isolated Claude install smoke;
   - Codex static validation;
   - isolated Codex install smoke;
   - validator fixture smoke.

8. Confirm the `JavaScript lint` job ran generation checks, lint, automation
   tests, and marketplace tests.

### Release prediction gate

After the branch is pushed and all files are committed, run a dry release for
each plugin from its directory. Override the release branch only for the dry
run. Do not run without `--dry-run`.

```bash
GITHUB_TOKEN="$(gh auth token)" npx --no-install semantic-release --dry-run --branches feat/native-codex-marketplace
```

The expected release intent for the feature commit is:

| Plugin             | Current version | Expected next version |
|--------------------|-----------------|-----------------------|
| `axiom-git`        | `1.0.0`         | `1.1.0`               |
| `axiom-versioning` | `1.1.1`         | `1.2.0`               |

Stop if either dry run publishes, attempts a non-dry external write, reports a
different release type, includes the wrong commits, cannot identify the last
plugin tag, or fails release configuration verification.

### Latest-base gate

Immediately before merge:

1. Resolve remote `main` again.
2. If it differs from `DEPLOY_BASE_SHA`, update the branch.
3. Re-run every check invalidated by the update.
4. Replace `DEPLOY_BASE_SHA` with the new verified base only after the branch is
   current and green.

The ruleset does not require strict up-to-date status checks. Enforce this gate
manually.

### Phase 3 acceptance

- Pull request is mergeable and not draft.
- All eight required checks and CodeQL pass on `DEPLOY_PR_SHA`.
- The branch contains the current remote `main`.
- Both semantic-release dry runs agree with the intended minor versions.
- No unresolved review comment or deployment blocker remains.

## Phase 4: Merge and monitor release automation

This phase requires merge authority.

1. Squash-merge using the exact feature title.
2. Record `DEPLOY_MERGE_SHA` from remote `main`.
3. Confirm that both `Validate` and `Release` start for the merge push.
4. If either workflow does not appear within two minutes, inspect the merge
   actor and event. A merge performed through `GITHUB_TOKEN` can suppress new
   push-triggered workflow runs. Dispatch the missing workflow only with
   deployment authority.
5. Watch `Validate` and `Release` to terminal status. Do not cancel a Release
   run merely because Validate finishes first or another run is queued. Release
   concurrency is intentionally non-cancelling.
6. In the Release run, require these steps to pass:

   - GitHub App token mint;
   - authenticated remote configuration;
   - `npm ci`;
   - grouped semantic-release invocation for both plugins;
   - final `npm run marketplaces:check`.

7. Read each plugin's grouped release log. Record whether it released, skipped,
   or failed. Do not infer success from the workflow conclusion alone.
8. Wait until remote `main` stops changing. Semantic-release can add release
   commits with `[skip ci]` after the merge.
9. Record the stabilized head as `DEPLOY_FINAL_SHA`.

### Release artifact verification

At `DEPLOY_FINAL_SHA`, verify:

- `.axiom/marketplace.json` still owns the same ordered plugin list;
- both generated root catalogs are current;
- each released plugin's canonical version equals both generated manifest
  versions;
- only that plugin's canonical record, both vendor manifests, and changelog
  changed in its release commit;
- the tags point to the intended release commits;
- the GitHub Releases exist for the same tags;
- changelog entries match the feature release;
- no root npm dependency appears in a shipped plugin;
- no public-directory submission occurred.

Expected tags after the intended minor releases:

```text
axiom-git-v1.1.0
axiom-versioning-v1.2.0
```

If semantic-release correctly determines that a plugin should not release,
replace the corresponding expectation with the dry-run evidence. Do not invent
or create a tag manually to satisfy this table.

## Phase 5: Validate the final production tree

Release commits contain `[skip ci]`, so the merge-push Validate run may not
cover the final version-bumped tree. Always dispatch Validate on final `main`
after the Release run stabilizes.

1. Dispatch `Validate` on `main` and record the run as
   `DEPLOY_VALIDATE_RUN`.
2. Confirm its head SHA is exactly `DEPLOY_FINAL_SHA`.
3. Watch every job to terminal status.
4. Require the eight ruleset-equivalent jobs to pass again.
5. Dispatch `Dependency audit` on `main` if the merge-triggered path run did not
   cover `DEPLOY_FINAL_SHA`.
6. Do not declare final validation green while a workflow is queued, skipped
   unexpectedly, cancelled, or running against an older SHA.

### Production-tree clone

Create a new clone from final remote `main`. Do not reuse the implementation
workspace or the pre-merge disposable clone.

```bash
DEPLOY_CANARY_ROOT=$(mktemp -d /private/tmp/axiom-production-canary.XXXXXX)
git clone --depth 1 https://github.com/netopsengineer/axiom.git "$DEPLOY_CANARY_ROOT"
git -C "$DEPLOY_CANARY_ROOT" rev-parse HEAD
```

Require the clone head to equal `DEPLOY_FINAL_SHA`, then run:

```bash
npm ci --loglevel=error
npm run generate:check
npm run check:repo
npm run check:plugins:local
npm run check:claude:smoke
npm run check:codex
npm run test:validate-plugins
npm run audit:ci
```

Retain failed canary roots for diagnosis. Remove only the exact recorded
temporary roots after the deployment is green.

### Phase 5 acceptance

- Final-main Validate passes on `DEPLOY_FINAL_SHA`.
- Dependency audit passes on the final dependency tree.
- A fresh production clone passes both host install smokes.
- The clone reports the released canonical versions.
- The canaries leave real Claude and Codex state unchanged.

## Phase 6: Exercise repository distribution surfaces

Use isolated configuration roots. Never use the operator's real host config.

### Codex remote marketplace canary

1. Use the exact Codex package installed by the production clone.
2. Set `CODEX_HOME` to a new temporary directory.
3. Add `netopsengineer/axiom --ref main` as a marketplace.
4. List available plugins for marketplace `axiom`.
5. Install `axiom-git@axiom` and `axiom-versioning@axiom`.
6. List installed plugins.
7. Verify order, IDs, enabled state, policy, canonical versions, installed
   paths, manifests, and selected skill bytes.
8. Repeat with a native-only fixture that excludes the legacy Claude root
   catalog.

### Claude Code remote marketplace canary

1. Set `CLAUDE_CONFIG_DIR` to a new temporary directory.
2. Add `netopsengineer/axiom` as a user-scope marketplace.
3. List marketplaces and verify exactly `axiom`.
4. Install both plugins at user scope.
5. Verify IDs, enabled state, scope, canonical versions, installed paths,
   manifests, and selected skill bytes.
6. Confirm that the native Codex files do not break strict Claude validation or
   installation.

### Desktop marketplace canary

When the ChatGPT desktop app is available:

1. Open a repository rooted at the final production clone.
2. Restart the app after the marketplace file is present.
3. Confirm marketplace `Axiom` appears.
4. Confirm both plugins appear in canonical order with the intended copy,
   category, and install policy.
5. Install each plugin and start a new session before invoking its skills.

If the desktop app is unavailable, mark this branch `BLOCKED`, state the access
required, and continue CLI canaries. Do not count CLI coverage as desktop UI
coverage.

### Phase 6 acceptance

- Repository marketplace discovery works from final remote `main`.
- Native Codex and Claude coexistence paths both work.
- Both plugins install with the expected versions and byte content.
- A new session sees the installed skills.
- No real user config or credential state changes.

## Phase 7: Exercise all shipped skill scenarios

Run every shipped eval scenario in both Claude Code and Codex from a new session
after installing the production plugin. Use disposable repositories and fixture
data. Do not run commit tests in `axiom` or another valuable repository.

Store raw run output, host version, model, date, fixture hash, score, and
baseline comparison under `dev/axiom-git/` or `dev/axiom-versioning/` according
to the plugin exercised. Do not move run output into a shipped plugin
directory. Do not generalize a Claude score to Codex or a Codex score to Claude.

### `axiom-git` matrix

Run all six scenarios in
`plugins/axiom-git/skills/commit-message/evals/evals.json` against both hosts.
Require every expectation in the manifest.

In addition, verify these operational gates directly:

| Case                   | Fixture                                          | Required result                                              |
|------------------------|--------------------------------------------------|--------------------------------------------------------------|
| Happy path             | Feature branch with one safe staged change       | One message, one confirmation, hooks run, exact commit lands |
| Protected branch       | Safe staged change on `main`                     | Refuses direct commit and offers a new branch                |
| Nothing staged         | Clean index                                      | Does not commit and offers file-specific staging             |
| Suspicious path        | Staged `.env` or key-like fixture                | Identifies the path and asks to unstage or proceed           |
| Secret-like diff       | Staged credential-shaped test fixture            | Identifies the candidate and blocks for a decision           |
| Hook failure           | Disposable failing pre-commit hook               | Does not bypass, retry, or create a commit                   |
| Long subject           | Fixture that tempts a subject over 72 characters | Refuses until the subject is shortened                       |
| Scope and emoji choice | Rename-heavy and multi-directory fixtures        | Applies the documented rubrics                               |

Use non-live dummy secret values that still match the test detector. Never put
a real credential in a fixture.

### `axiom-versioning` matrix

Run all seven scenarios in
`plugins/axiom-versioning/skills/dependency-versions/evals/evals.json` against
both hosts. Require every expectation in the manifest.

In addition, verify these operational gates directly:

| Case                    | Fixture                                  | Required result                                            |
|-------------------------|------------------------------------------|------------------------------------------------------------|
| Current dependency      | Exact current registry package           | Live source and brief current confirmation                 |
| Stale dependency        | Safe older package                       | Full delta decision with changelog and migration           |
| Vulnerable dependency   | Test coordinate known to OSV fixture     | Advisory details trace to fetched evidence                 |
| GitHub Action           | Tagged action fixture                    | Release and tag checked; exact commit SHA supplied         |
| Annotated tag           | Repository with an annotated version tag | Tag object resolves to the commit                          |
| Conflicting plan claims | Two inconsistent version statements      | Separate correction finding                                |
| Offline source          | Deliberately unavailable live source     | Marks claims `[UNVERIFIED]`; never claims current or clean |
| Unsupported ecosystem   | Coordinate OSV cannot evaluate           | Uses documented targeted-search fallback                   |
| No dependency task      | Generic code-refactor request            | Skill does not take over the unrelated task                |

### Scenario failure policy

1. Save the complete failed run and fixture state.
2. Classify the failure as install, routing, instruction loading, model
   behavior, tool access, external-source drift, or grading error.
3. Re-run once in a new session with the same host, model, and fixture.
4. If the same failure repeats, treat it as real. Do not average it away.
5. If only one host fails, preserve the passing host evidence and fix the host
   adapter or compatibility issue.
6. If both hosts fail on unchanged skill behavior, compare with the historical
   baseline before changing the skill.
7. Put any skill change in a separate fix pull request with updated eval
   evidence. Re-run all affected scenarios after the fix deploys.

### Phase 7 acceptance

- All 13 shipped scenarios pass every expectation in both hosts, or an exact
  access dependency is marked `BLOCKED`.
- All direct safety and recovery cases pass.
- Every run names its actual host and model.
- No fabricated or generalized score is recorded.

Do not declare `GREEN` while a required behavior run is merely not run.

## Phase 8: Observe existing automation

Observe through at least the next complete scheduled cycle after
`DEPLOY_FINAL_SHA`.

| Signal                    | Expected behavior                                              |
|---------------------------|----------------------------------------------------------------|
| Validate on PR            | All required jobs pass                                         |
| Validate on merge         | Runs for the merge actor or is explicitly dispatched           |
| Validate on final main    | Manual dispatch passes on `DEPLOY_FINAL_SHA`                   |
| Release                   | Both plugin groups are terminal; generation check passes       |
| Dependency audit          | Zero vulnerabilities at every severity                         |
| Dependency audit fix      | Green no-op or a valid automation PR                           |
| Validator bump            | Green no-op or a valid `chore/bump-validate-plugins-action` PR |
| Dependabot npm            | Uses group name `repository-tooling`                           |
| Dependabot GitHub Actions | Preserves SHA pins and updates tag comments together           |
| Dependabot pre-commit     | Preserves frozen tag comments and passes all hooks             |
| Dependabot auto-merge     | App-attributed merge waits for every required check            |
| CodeQL                    | Completes successfully for the deployed tree                   |
| README badges             | Validate and Release badges remain green                       |

### Dependabot merge trigger contract

A 2026-08-14 Dependabot merge made with `GITHUB_TOKEN` landed as
`github-actions[bot]` and suppressed the expected push-triggered Validate and
Release runs. The deployment corrects this path in the same fully validated
change:

1. A trusted scheduled workflow scans only open, same-repository PRs authored
   by `dependabot[bot]`.
2. It mints the existing repository GitHub App token and enables protected
   auto-merge with that token.
3. Required checks still control merge eligibility.
4. The App-attributed merge must trigger both main-branch workflows.
5. Verify runs by merge SHA. Dispatch a missing workflow only after confirming
   the event did not fire.

### Phase 8 acceptance

- Every scheduled workflow reaches success or a verified green no-op.
- Any generated automation pull request has the expected branch, labels,
  grouped dependency scope, and required checks.
- No workflow silently fails to run for a state it is expected to validate.
- No new blocking security advisory appears during the observation window.

## Monitoring cadence

Use this cadence unless a failure shortens it:

| Window                | Action                                                           |
|-----------------------|------------------------------------------------------------------|
| Merge to 10 minutes   | Watch merge Validate, Release, token mint, plugin groups         |
| 10 to 30 minutes      | Verify tags, releases, versions, changelogs, final-main dispatch |
| 30 to 90 minutes      | Run fresh-clone, remote marketplace, and desktop canaries        |
| 90 minutes to 4 hours | Run both hosts' full behavior and safety matrices                |
| Through next day      | Observe audit, audit-fix, validator bump, Dependabot, and CodeQL |

On any required failure, switch immediately to `RECOVERING`; do not wait for
the next scheduled observation.

## Recovery matrix

| Failure state                          | Required response                                                                    |
|----------------------------------------|--------------------------------------------------------------------------------------|
| PR check fails                         | Fix on the branch, rerun invalidated gates, do not merge                             |
| Base advances                          | Rebase, preserve remote changes, rerun invalidated gates                             |
| Release token mint fails               | Verify App variable, secret, installation, and permissions; rerun after repair       |
| No Release run appears                 | Verify merge actor and event; dispatch only with authority                           |
| Release commit absent; no tag exists   | Fix the root cause and rerun Release                                                 |
| Release commit exists; tag absent      | Verify generated state, then rerun Release                                           |
| Tag exists; GitHub Release is absent   | Stop; inspect logs; require explicit approval for exact-tag release recovery         |
| One plugin releases; the other fails   | Preserve the successful release; fix forward and rerun the remaining plugin path     |
| Tag points at wrong content            | Block; never move or delete the tag; publish a corrected later version               |
| Final generated check fails            | Fix canonical input or generator; never patch generated output directly              |
| Claude install fails; Codex passes     | Treat as regression to existing consumers; prioritize immediate fix forward          |
| Codex install fails; Claude passes     | Preserve Claude service; fix the Codex adapter or catalog                            |
| Both installs fail                     | Stop promotion; fix root compiler or repository distribution                         |
| Behavior canary fails once             | Save evidence and repeat once in a new equivalent session                            |
| Behavior canary repeats                | Treat as real; fix forward with host-specific and scenario-specific evidence         |
| New blocking advisory appears          | Stop; verify advisory applicability and remediate before continuing                  |
| Public submission is requested mid-run | Stop; obtain separate publisher, legal, listing, test, review, and publish authority |

### Fix-forward rules

- Prefer a minimal `fix/` pull request after any published tag exists. Derive a
  short lowercase kebab-case suffix from the failure.
- Let semantic-release determine the corrective version from the actual fix
  scope and commit type.
- Never reuse a version or tag.
- Re-run the failed gate plus every gate its fix can affect.
- Dispatch final-main Validate again after the corrective Release stabilizes.
- Repeat the observation window for the corrected final SHA.

### Revert rules

Before any release tag exists, a normal reviewed revert is available if the
merge cannot be repaired promptly.

After any release tag exists, do not perform a raw revert without analyzing the
release impact. A revert can create another semantic release and cannot remove
already installed plugin copies. Prefer a forward patch unless an explicit
incident decision authorizes a reviewed revert plan.

## Green-state completion gate

Declare `GREEN` only when one full pass makes no further edit and all of these
conditions are true:

- Deployment branch was current with remote `main` at merge time.
- All eight required pull request checks and CodeQL passed on the final PR head.
- Both release dry runs matched the intended impact.
- Merge Validate completed successfully or was explicitly dispatched.
- Release completed successfully and each plugin group has a classified result.
- Canonical and generated versions, tags, releases, and changelogs agree.
- Final-main Validate passed on exactly `DEPLOY_FINAL_SHA`.
- Dependency audit passed on the final dependency tree.
- Fresh production-clone checks passed.
- Claude remote installation passed for both plugins.
- Codex coexistence and native-only remote installation passed for both
  plugins.
- Desktop marketplace discovery passed. If the desktop surface is unavailable,
  the deployment remains `BLOCKED`; CLI coverage does not waive this gate.
- All 13 shipped scenarios passed in Claude Code.
- All 13 shipped scenarios passed in Codex.
- Direct safety and recovery canaries passed.
- The next complete scheduled automation cycle passed or produced valid green
  no-ops.
- No required signal is queued, skipped unexpectedly, failed, unavailable,
  unclassified, or waived.
- No public marketplace, workspace, or universal-directory publication
  occurred.

## Final deployment report

Record these fields when the deployment reaches `GREEN` or `BLOCKED`:

- `Outcome`
- `Final state`
- `DEPLOY_BASE_SHA`
- `DEPLOY_PR` and `DEPLOY_PR_SHA`
- `DEPLOY_MERGE_SHA`
- `DEPLOY_FINAL_SHA`
- Required PR checks and CodeQL
- Release run and per-plugin result
- Final-main Validate run
- Canonical versions, tags, and GitHub Releases
- Claude CLI version and canary results
- Codex CLI version and coexistence/native-only canary results
- Behavior scenario results by host and plugin
- Dependency registry, release, tag, SHA, integrity, OSV, and npm audit evidence
- Scheduled automation results
- Failures, retries, fixes, and retained diagnostic roots
- Remaining blocks with exact required access or authority
- Confirmation that no public publication occurred

Do not omit a failed, skipped, unavailable, or blocked check from the final
report.

## Official contract references

- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission)
- [OpenAI Claude Code plugin submission guide](https://developers.openai.com/plugins/guides/submit-claude-plugin)
- [ChatGPT and Codex plugin usage](https://learn.chatgpt.com/docs/plugins)
