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

Iterations 1-3 were evaluated 2026-03-21 through 2026-03-23 using Claude
Sonnet 4.6 as executor and Claude Opus 4.6 as grader, across five test
scenarios covering pre-commit audits, GHA workflow planning, single-dependency
deep dives, plan review with false claims, and bulk SHA pinning. Iteration 4
was evaluated 2026-07-06 using Claude Sonnet 5 as executor and Claude Opus 4.8
as grader, adding two security-focused scenarios (2 runs each).

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

### Iteration 4: OSV.dev integration + anti-hallucination guardrail vs iteration 3 skill (7 evals)

Rewired the security-check step to run a bundled `scripts/osv_scan.py` first —
one batched call against the OSV.dev vulnerability database (GHSA/PYSEC/CVE
across npm, PyPI, Go, crates.io, and GitHub Actions) — falling back to
`WebSearch` only when the script can't help. Added a guardrail requiring every
advisory ID, affected range, fixed-in version, and attribution detail to trace
to a specific tool call, never memory. Added two new evals with fixtures
independently verified live against OSV.dev before the eval was written: an
"assumed-safe" trap (well-known packages pinned at versions that look patched
but carry current, less-famous CVEs) and a multi-ecosystem lockfile audit
including a real embedded-malware supply-chain package. Compared against the
iteration 3 snapshot with neutral, identical prompts across both configs (no
coverage hints).

A first eval attempt (evals built on famous, training-data-known CVEs) showed
no measurable delta and was discarded rather than published — those fixtures
didn't discriminate between a skill using live data and a capable model
recalling well-known advisories from training. The eval set below replaced it.

| Eval                                | Old Skill       | New Skill        | Delta     |
|-------------------------------------|-----------------|------------------|-----------|
| Pre-commit Version Audit            | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| GHA CI Planning                     | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| Biome Deep Dive                     | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| Plan Review (Corrections)           | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| Actions SHA Pinning                 | 100% (5/5)      | 100% (5/5)       | +0 pp     |
| npm Assumed-Safe Scan (2 runs)      | 86% (12/14)     | 100% (14/14)     | +14 pp    |
| Obscure-CVE Lockfile Audit (2 runs) | 94% (15/16)     | 100% (16/16)     | +6 pp     |
| **Overall**                         | **95% (52/55)** | **100% (55/55)** | **+5 pp** |

The pass-rate delta understates the actual gap. Grading the two security evals
line-by-line surfaced a hard hallucination in the old (WebSearch-based) skill:
one run fabricated a complete advisory — a fake GHSA ID, a fake publish date, a
fake technical description, and a fake "verified via live fetch" citation —
for a real package, none of which exist in the actual OSV data. A second run
falsely claimed nine additional untracked advisories that don't exist. The
OSV-grounded skill had zero fabricated citations across all 9 of its eval runs,
including on the two evals designed specifically to surface this failure mode.
Separately, the old skill twice denied a real, assigned CVE existed for a
known malicious package — factually wrong, not merely incomplete.

Not every finding favored the new skill: on the Biome eval, the old skill
executed the CLI's own suggested migration command and caught a live upstream
bug (it silently disables all lint rules) that the new skill's report
recommended running without any such warning — logged as a follow-up fix
independent of the OSV work.

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
- **Iteration 3 -> 4**: Added `scripts/osv_scan.py` (batched OSV.dev lookups)
  as the primary security-check method, with `WebSearch` as an explicit
  fallback. Added a guardrail requiring every advisory ID, range, fixed
  version, and attribution detail to trace to a specific tool call — never
  reconstructed from memory. Replaced the two security-focused evals with
  fixtures verified live against OSV.dev, chosen specifically to discriminate
  between live-data grounding and recall of famous, training-data-known CVEs.
