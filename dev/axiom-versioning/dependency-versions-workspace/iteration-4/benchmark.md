# Skill Benchmark: dependency-versions (iteration 4 — OSV.dev + anti-hallucination guardrail)

**Executor model**: claude-sonnet-5  |  **Grading/analyst model**: claude-opus-4-8
**Date**: 2026-07-06  |  **Evals**: 1-7 (1 run each for evals 1-5, 2 runs each for evals 6-7)
**Baseline (old_skill)**: skill-snapshot-iter3 — pre-OSV skill, WebSearch-based security

A discarded first attempt at this iteration (famous, training-data-known CVE
fixtures for evals 6-7) showed no measurable delta and was deleted rather than
published — see the plugin README's Eval history for details. This document
covers only the published, replacement eval set.

## Summary

| Metric | With Skill (OSV) | Old Skill (WebSearch) | Delta |
|--------|------------------|-----------------------|-------|
| Pass Rate | 100.0% ± 0.0% | 95.4% ± 6.9% | +0.046 |
| Time | not captured | not captured | n/a |
| Tokens | not captured | not captured | n/a |

## Per-Run Pass Rate

| Eval | Run | With Skill | Old Skill |
|------|-----|------------|-----------|
| pre-commit-version-audit | 1 | 5/5 (100%) | 5/5 (100%) |
| gha-ci-planning | 1 | 5/5 (100%) | 5/5 (100%) |
| biome-deep-dive | 1 | 5/5 (100%) | 5/5 (100%) |
| plan-review-corrections | 1 | 5/5 (100%) | 5/5 (100%) |
| actions-sha-pinning | 1 | 5/5 (100%) | 5/5 (100%) |
| npm-assumed-safe-scan | 1 | 7/7 (100%) | 6/7 (86%) |
| npm-assumed-safe-scan | 2 | 7/7 (100%) | 6/7 (86%) |
| obscure-cve-lockfile-audit | 1 | 8/8 (100%) | 8/8 (100%) |
| obscure-cve-lockfile-audit | 2 | 8/8 (100%) | 7/8 (88%) |

## Analyst Notes

- REAL PASS-RATE DELTA THIS TIME: with_skill 100% (9/9 runs, 0 stddev) vs old_skill 95.4% mean (stddev 0.069). Unlike the discarded first attempt's flat +0.00, the redesigned evals 6-7 (verified-live, less-famous CVE fixtures) produced a genuine, reproducible gap — every old_skill shortfall traces to a category the OSV script structurally prevents.
- HEADLINE FINDING - HARD HALLUCINATION: eval-6 old_skill/run-2 fabricated a complete advisory — GHSA-mmx7-hfxf-jppx plus four sibling IDs, a fake publish date, a fake technical description, and a fake 'verified via live WebFetch' citation for axios 1.6.0. None exist in the real OSV dataset (confirmed by diffing against with_skill's own saved osv_scan JSON, which contains the true 26-advisory axios set). Both with_skill runs on this eval scored 100% advisory-ID traceability — every citation traced to its own tool output.
- SOFTER HALLUCINATION, SAME EVAL: old_skill/run-1 claimed '9 additional GHSA-tracked issues, CVE IDs not yet assigned' for axios, falsely implying uncounted vulnerabilities beyond the real 26 (all of which already have CVE numbers). No concrete fake ID was named, so it didn't trip the literal 'no fabricated IDs' assertion — a grader-flagged wording gap worth closing in a future iteration (add an assertion for invented vulnerability counts/categories, not just invented ID strings).
- SYSTEMATIC OLD_SKILL RESEARCH GAP (eval-7, not fabrication but real): both old_skill runs affirmatively denied that ua-parser-js's malware advisory had an assigned CVE ('no CVE ID assigned/commonly cited'). This is factually false — CVE-2021-4229 is the real, assigned CVE. Both with_skill runs correctly cited it. No assertion currently penalizes confidently denying a real CVE exists; flagged for a future iteration.
- COUNTER-FINDING - OLD_SKILL WAS MORE RIGOROUS HERE: on eval-3 (biome-deep-dive), old_skill actually executed `npx @biomejs/biome@2.5.2 migrate --write` twice and empirically caught a live upstream bug (produces `preset: "none"`, silently disabling all lint rules, tracked at biomejs/biome#10716) before recommending it. with_skill's report recommends the same `biome migrate --write` command with no such warning. Both passed the eval's assertion (it only checks whether config-impact was assessed), but this is a genuine capability gap in with_skill's specific remediation advice worth fixing independent of the OSV work.
- EXECUTION-ARTIFACT CORRECTION: gha-ci-planning/old_skill/run-1 initially ran out of budget mid-task (report literally headed 'Status: IN PROGRESS', zero workflow YAML produced) and was retried once with pacing guidance; the retry reached a complete 5/5 deliverable. The stale incomplete file was deleted. This was an execution artifact, not a reflection of the old skill's actual capability, and would have unfairly deflated old_skill's score if left uncorrected.
- GITHUB ACTIONS RANGE REASONING held up across both configs in both security evals (eval-6 N/A here, eval-7's ua-parser-js and eval-6's prior-iteration tj-actions case) — no false-clean or false-vulnerable verdicts on tag-based ecosystems in this run.
- ANTI-HALLUCINATION GUARDRAIL ADDED THIS ITERATION (SKILL.md Invariant 3 + Step 6 self-check: every advisory ID/range/fixed-version/attribution must trace to a specific tool call) appears to be doing its job on the with_skill side — zero fabrications across all 9 with_skill runs, including on the two evals specifically designed to surface this failure mode.
- METHODOLOGY: neutral, identical prompts used across both configs this time (no dependency checklist hints, unlike the discarded first attempt's eval-7 retries) — this iteration's evals-6/7 delta is not an artifact of unequal framing.
- TIMING/TOKENS NOT CAPTURED: as with the discarded first attempt, per-run timing wasn't captured through the notification pipeline this run; pass-rate and the qualitative hallucination findings carry the comparison.

