# Skill Benchmark: dependency-versions

**Model**: claude-sonnet-4-6
**Date**: 2026-03-23T18:08:07Z
**Evals**: 1, 2, 3, 4, 5 (1 run each per configuration)
**Baseline**: old_skill (iter2 new_skill snapshot — pre dual-finding fix)

## Summary

| Metric    | With Skill      | Old Skill      | Delta  |
|-----------|-----------------|----------------|--------|
| Pass Rate | 100% ± 0%       | 96% ± 9%       | +0.04  |
| Time      | 368.9s ± 134.2s | 323.3s ± 70.9s | +45.6s |
| Tokens    | 43942 ± 13884   | 40656 ± 10691  | +3286  |

## Per-Eval Breakdown

| Eval                      | With Skill | Old Skill  | Delta  |
|---------------------------|------------|------------|--------|
| Pre-commit Version Audit  | 100% (5/5) | 100% (5/5) | +0 pp  |
| GHA CI Planning           | 100% (5/5) | 100% (5/5) | +0 pp  |
| Biome Deep Dive           | 100% (5/5) | 100% (5/5) | +0 pp  |
| Plan Review (Corrections) | 100% (5/5) | 80% (4/5)  | +20 pp |
| Actions SHA Pinning       | 100% (5/5) | 100% (5/5) | +0 pp  |

## Per-Eval Timing

| Eval                      | With Skill | Old Skill | Delta   |
|---------------------------|------------|-----------|---------|
| Pre-commit Version Audit  | 264.8s     | 239.4s    | +25.4s  |
| GHA CI Planning           | 543.3s     | 383.9s    | +159.4s |
| Biome Deep Dive           | 296.8s     | 304.7s    | -7.9s   |
| Plan Review (Corrections) | 256.6s     | 280.5s    | -23.9s  |
| Actions SHA Pinning       | 482.9s     | 408.1s    | +74.8s  |

## Per-Eval Tokens

| Eval                      | With Skill | Old Skill | Delta |
|---------------------------|------------|-----------|-------|
| Pre-commit Version Audit  | 40598      | 32884     | +7714 |
| GHA CI Planning           | 65047      | 56970     | +8077 |
| Biome Deep Dive           | 32600      | 33193     | -593  |
| Plan Review (Corrections) | 31645      | 34018     | -2373 |
| Actions SHA Pinning       | 49820      | 46214     | +3606 |

## Analysis

- **Perfect pass rate achieved**: The dual-finding rule fixed the last
  remaining failure — the old skill (iter2 snapshot) still merges false
  contemporaneity labels into version delta blocks instead of giving them
  dedicated CORRECTION entries.
- **The one failure fixed**: Plan Review eval — old_skill flagged false
  "current stable" / "latest stable release" labels within DEPRECATION
  blocks but did not create separate CORRECTION-level findings. The
  dual-finding rule in the new skill explicitly requires both entries.
- **Token/time overhead is minimal**: +8% tokens, +14% time compared to
  the iter2 snapshot. The improvement didn't add expensive new steps —
  just clearer separation of finding types.
- **Variance**: With-skill time variance is higher (±134s vs ±71s) driven
  by the GHA CI Planning eval (543s). This eval has the most dependencies
  to verify and produces the longest reports.
