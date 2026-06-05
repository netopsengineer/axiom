# Skill Benchmark: dependency-versions

**Model**: claude-sonnet-4-6
**Date**: 2026-03-23T17:47:14Z
**Evals**: 1, 2, 3, 4, 5 (1 run each per configuration)
**Baseline**: old_skill (pre-change snapshot)

## Summary

| Metric    | With Skill     | Old Skill      | Delta |
|-----------|----------------|----------------|-------|
| Pass Rate | 96% ± 9%       | 88% ± 18%      | +0.08 |
| Time      | 361.7s ± 56.0s | 362.9s ± 84.6s | -1.2s |
| Tokens    | 37819 ± 6377   | 39234 ± 7004   | -1415 |

## Per-Eval Breakdown

| Eval                      | With Skill | Old Skill  | Delta  |
|---------------------------|------------|------------|--------|
| Pre-commit Version Audit  | 100% (5/5) | 80% (4/5)  | +20 pp |
| GHA CI Planning           | 100% (5/5) | 100% (5/5) | +0 pp  |
| Biome Deep Dive           | 100% (5/5) | 100% (5/5) | +0 pp  |
| Plan Review (Corrections) | 80% (4/5)  | 60% (3/5)  | +20 pp |
| Actions SHA Pinning       | 100% (5/5) | 100% (5/5) | +0 pp  |

## Per-Eval Timing

| Eval                      | With Skill | Old Skill | Delta   |
|---------------------------|------------|-----------|---------|
| Pre-commit Version Audit  | 375.0s     | 348.3s    | +26.7s  |
| GHA CI Planning           | 442.8s     | 320.4s    | +122.4s |
| Biome Deep Dive           | 287.6s     | 428.4s    | -140.8s |
| Plan Review (Corrections) | 358.8s     | 253.2s    | +105.6s |
| Actions SHA Pinning       | 344.4s     | 464.4s    | -120.0s |

## Per-Eval Tokens

| Eval                      | With Skill | Old Skill | Delta |
|---------------------------|------------|-----------|-------|
| Pre-commit Version Audit  | 40978      | 42336     | -1358 |
| GHA CI Planning           | 45709      | 42987     | +2722 |
| Biome Deep Dive           | 29209      | 34808     | -5599 |
| Plan Review (Corrections) | 34016      | 29361     | +4655 |
| Actions SHA Pinning       | 39183      | 46680     | -7497 |

## Analysis

- **+8 pp improvement** over the iteration-1 skill snapshot, with nearly
  identical time and tokens — the improvement didn't cost more.
- **Lower variance**: with_skill ±9% vs old_skill ±18% — the new version
  is more consistent across eval cases.
- **One remaining failure**: Plan Review eval (80%) — the skill correctly
  identified false "current stable" / "latest stable release" claims but
  used DEPRECATION instead of CORRECTION as the risk level. Fixed in
  iteration 3 with the dual-finding rule.
- **Security gap closed**: Old skill missed sync-pre-commit-deps in the
  Pre-commit Version Audit (80%). New skill's explicit "every dependency"
  language caught it.
