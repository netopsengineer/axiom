# Axiom Versioning

> Part of the [axiom](../../README.md) Claude Code plugin marketplace.

Audits and updates external versioned dependencies across application,
infrastructure, and CI/CD configurations. Teaches Claude to verify every version
claim against live sources, check security advisories, use SHA pinning for
GitHub Actions, and present version deltas in a structured decision format
rather than silently preserving or upgrading.

## Install

```shell
# 1. Add the axiom marketplace
/plugin marketplace add netopsengineer/axiom

# 2. Install the plugin
/plugin install axiom-versioning@axiom
```

## What's inside

Right now Axiom Versioning ships a single skill, `dependency-versions`. It's the
foundation the plugin is built on, with more capabilities to come as the plugin
expands.

### `dependency-versions` skill

Activates automatically when a task involves external versioned dependencies:

- Live version verification via GitHub API, PyPI, npm (never training data)
- Both `/releases/latest` AND `/tags` checked (they diverge)
- Security/CVE advisory search for every dependency
- SHA pinning for GitHub Actions with annotated tag resolution
- Structured decision format (Risk level, Verified via, What changed, Breaking
  changes, Migration steps, Security advisories, Recommendation, Your call)
- Dual-finding rule: stale versions with false labels get both a version delta
  and a CORRECTION entry
- Verification log table with self-check for every report
- Review vs implementation mode (no timeline questions on review tasks)
- Changelog review for every upgrade path
- Coordinated upgrade group detection

See [`CHANGELOG.md`](CHANGELOG.md) for release history.

## Eval history

Evaluated across three iterations (2026-03-21 through 2026-03-23) using Claude
Sonnet 4.6 as executor and Claude Opus 4.6 as grader. Five test scenarios
covering pre-commit audits, GHA workflow planning, single-dependency deep dives,
plan review with false claims, and bulk SHA pinning.

### Iteration 1: Skill vs no skill (3 evals)

| Eval                     | Without Skill  | With Skill      | Delta      |
|--------------------------|----------------|-----------------|------------|
| Pre-commit Version Audit | 40% (2/5)      | 80% (4/5)       | +40 pp     |
| GHA CI Planning          | 40% (2/5)      | 100% (5/5)      | +60 pp     |
| Biome Deep Dive          | 60% (3/5)      | 100% (5/5)      | +40 pp     |
| **Overall**              | **47% (7/15)** | **93% (14/15)** | **+47 pp** |

### Iteration 2: Revised skill vs iteration 1 skill (5 evals)

Added two new evals (plan review with CORRECTION findings, bulk SHA pinning).
Compared the revised skill against the iteration 1 snapshot.

| Eval                      | Old Skill       | New Skill       | Delta     |
|---------------------------|-----------------|-----------------|-----------|
| Pre-commit Version Audit  | 80% (4/5)       | 100% (5/5)      | +20 pp    |
| GHA CI Planning           | 100% (5/5)      | 100% (5/5)      | +0 pp     |
| Biome Deep Dive           | 100% (5/5)      | 100% (5/5)      | +0 pp     |
| Plan Review (Corrections) | 60% (3/5)       | 80% (4/5)       | +20 pp    |
| Actions SHA Pinning       | 100% (5/5)      | 100% (5/5)      | +0 pp     |
| **Overall**               | **88% (22/25)** | **96% (24/25)** | **+8 pp** |

### Iteration 3: Dual-finding fix vs iteration 2 skill (5 evals)

Added the dual-finding rule (false contemporaneity claims get their own
CORRECTION entry separate from version deltas). Compared against the
iteration 2 snapshot.

| Eval                      | Old Skill       | New Skill        | Delta     |
|---------------------------|-----------------|------------------|-----------|
| Pre-commit Version Audit  | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| GHA CI Planning           | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| Biome Deep Dive           | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| Plan Review (Corrections) | 80% (4/5)       | 100% (5/5)       | +20 pp    |
| Actions SHA Pinning       | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| **Overall**               | **96% (24/25)** | **100% (25/25)** | **+4 pp** |

### What failed without the skill (iteration 1)

| Pattern                                    | Pre-commit | GHA CI | Biome |
|--------------------------------------------|------------|--------|-------|
| Structured decision format with all fields | fail       | fail   | fail  |
| Verification log table at end              | fail       | fail   | n/a   |
| Security/CVE search for every dependency   | fail       | fail   | pass  |
| Checked BOTH releases AND tags             | pass       | n/a    | fail  |
| SHA-pinned GitHub Actions                  | n/a        | pass   | n/a   |
| Used live sources to verify versions       | pass       | pass   | pass  |

Without the skill, Claude fetches live versions but defaults to freeform
reports without structured decision formats, verification logs, or systematic
security coverage. SHA pinning passes without the skill when the prompt
explicitly mentions it.

### What improved across iterations

| Gap                                  | Iter 1 | Iter 2 | Iter 3 |
|--------------------------------------|--------|--------|--------|
| Security search (all deps covered)   | 67%    | 100%   | 100%   |
| CORRECTION findings for false labels | n/a    | 80%    | 100%   |
| Decision format compliance           | 100%   | 100%   | 100%   |
| Verification log completeness        | 100%   | 100%   | 100%   |

### Token and time overhead

| Metric     | Without Skill | With Skill (iter 1) | Delta          |
|------------|---------------|---------------------|----------------|
| Avg tokens | 32,301        | 50,298              | +17,997 (+56%) |
| Avg time   | 302.7s        | 283.6s              | -19.1s (-6%)   |

The skill adds ~56% token overhead from live verification lookups (WebFetch,
WebSearch) and structured output, with comparable or slightly faster wall-clock
time due to more parallel tool use.

By iteration 3 (comparing revised skill vs old skill), overhead is minimal:
+3,286 tokens (+8%) and +45.6s (+14%).

### Description triggering (baseline)

Tested with 21 queries (11 should-trigger, 10 should-not).

Skill triggering is inherently conservative — Claude only consults skills for
tasks it cannot handle on its own. Precision (not triggering when it shouldn't)
is the priority. The description was rewritten from a generic one-liner to a
comprehensive trigger description listing specific patterns, config files, and
explicit exclusions.

### Description triggering (2026-06-16, length optimization)

The shipped description was 1067 characters, over the 1024-character
limit at which descriptions are truncated on load (some agents refuse
to load them at all), severing the trailing "Do NOT use for"
exclusion boundary. It was re-tuned to fit while preserving triggering
and coverage.

- **Method**: 20 trigger queries (10 should-trigger, 10 near-miss
  should-not-trigger), evaluated on Claude Sonnet 4.6 and Opus 4.8, 5
  runs per query, with candidate generation and held-out selection via
  a no-API-key `claude -p` loop.
- **Result**: shipped a 1006-character description (18 under the
  limit) with full coverage retained (Terraform drift, EKS,
  CircleCI/GitLab CI, Helm, Dependabot, config-file list). Opus
  triggered 10/10 should-trigger scenarios, zero false positives on
  either model, and Sonnet held within measurement noise of the
  original. The win is that it now loads in full with the exclusion
  boundary intact, not trigger rate (already at a ceiling).

### Changes made during eval cycle

- **Iteration 1 -> 2**: Fixed security search gap for low-profile repos
  (sync-pre-commit-deps was missed). Added two new evals (plan review with
  CORRECTION findings, bulk SHA pinning) to cover review-mode behavior and
  bundled security search documentation.
- **Iteration 2 -> 3**: Added the dual-finding rule — stale versions that also
  carry false contemporaneity labels ("current stable", "latest release") now
  require a dedicated CORRECTION entry separate from the version delta. This
  fixed the last remaining failure on the plan review eval.
- **`reference.md`**: Added worked examples for the dual-finding pattern,
  source quality hierarchy, coordinated upgrade groups, and annotated tag SHA
  resolution.
- **`SKILL.md` description**: Rewritten to comprehensive trigger description
  listing specific patterns, use cases, config files, and explicit exclusions.
