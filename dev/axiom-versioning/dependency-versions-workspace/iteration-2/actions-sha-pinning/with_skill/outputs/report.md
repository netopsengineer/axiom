# GitHub Actions Version & SHA Pinning Report

**Task:** Verify five GitHub Actions specified for a new workflow, obtain commit SHA pins, and identify any security issues.

**Actions requested:**

- `actions/checkout@v6`
- `actions/upload-artifact@v7`
- `actions/download-artifact@v8`
- `actions/cache@v5`
- `actions/setup-node@v4`

**Date of verification:** 2026-03-23

---

## Summary

| Action                    | Requested | Latest | Status                          | SHA (latest tag)                                                                                            |
|---------------------------|-----------|--------|---------------------------------|-------------------------------------------------------------------------------------------------------------|
| actions/checkout          | v6        | v6.0.2 | Current major; use latest patch | `de0fac2e4500dabe0009e67214ff5f5447ce83dd`                                                                  |
| actions/upload-artifact   | v7        | v7.0.0 | Current                         | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`                                                                  |
| actions/download-artifact | v8        | v8.0.1 | Patch upgrade needed            | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c`                                                                  |
| actions/cache             | v5        | v5.0.4 | Patch upgrade needed            | `668228422ae6a00e4ad889ee87cd7109ec5666a7`                                                                  |
| actions/setup-node        | v4        | v6.3.0 | **TWO major versions behind**   | v4 SHA: `49933ea5288caeca8642d1e84afbd3f7d6820020` / v6.3.0 SHA: `53b83947a5a98c8d113130e565377fae1a50d02f` |

---

## Decisions by Risk Level

### actions/setup-node: v4 -> v6.3.0

**Risk level:** BREAKING-UPGRADE (with embedded DEPRECATION pressure)
**Verified via:** WebFetch `api.github.com/repos/actions/setup-node/releases/latest` → v6.3.0 (2026-03-04); `/tags` also shows v6.3.0 as latest. WebSearch confirmed Node 20 EOL timeline.
**What changed:**

- **v5.0.0 (Oct 2025):** Automatic caching introduced when `packageManager` field is present in `package.json`. New parameter `package-manager-cache: false` to opt out. Runtime upgraded to Node 24.
- **v6.0.0 (date per tags):** Breaking change — automatic caching limited to npm only. `always-auth` configuration handling removed in v6.1.0.
- **v6.3.0 (Mar 2026):** Added `devEngines` field support, replaced `uuid` with `crypto.randomUUID()`, upgraded `minimatch` to 3.1.5, fixed npm audit issues.
**Breaking changes:** Yes.
- Auto-caching behavior changed — workflows relying on yarn/pnpm auto-caching from v5 will behave differently in v6 (npm only unless explicitly configured).
- `always-auth` input no longer respected as of v6.1.0.
- Node 24 runtime requires self-hosted runner v2.327.1+.
- Node 24 is incompatible with macOS 13.4 and lower.
- Node 24 has no official ARM32 support — self-hosted ARM32 runners unsupported.
**Migration steps:**

1. Update `actions/setup-node@v4` to `actions/setup-node@v6`.
2. If workflow used `always-auth: true`, remove that input — it no longer exists.
3. If you relied on yarn/pnpm auto-caching, you must now set `cache: 'yarn'` or `cache: 'pnpm'` explicitly.
4. Verify self-hosted runners are at v2.327.1+.
5. If running on macOS runners, verify macOS >= 13.5.
6. Test with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` before cutover.
**Security advisories:** No CVEs filed directly against `actions/setup-node`. Note: CVE-2025-61671 was filed against workflows that misuse `pull_request_target` combined with `actions/checkout` (not setup-node itself). No advisories found via WebSearch "actions/setup-node CVE security advisory 2025 2026".
**Temporal urgency:** Node 20 reaches EOL April 2026. GitHub will force all actions to Node 24 by default starting **June 2, 2026**. Using `actions/setup-node@v4` after that date risks forced runtime coercion and degraded behavior. Using v4 in a new workflow written today means it will break within ~10 weeks.
**Recommendation:** Do not ship a new workflow with v4. This is being written from scratch — use v6.3.0 (SHA-pinned) from day one. There is no reason to start two major versions behind when the deadline to migrate is 10 weeks away.
**Your call:** Use `actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0` in the new workflow. If you have existing workflows on v4, those need migration before June 2, 2026.

---

### actions/download-artifact: v8 (unspecified patch) -> v8.0.1

**Risk level:** ROUTINE (with a behavioral default change to note)
**Verified via:** WebFetch `api.github.com/repos/actions/download-artifact/releases/latest` → v8.0.1 (2026-03-11); `/tags` confirms v8.0.1 as latest.
**What changed between v8.0.0 and v8.0.1:**

- Added support for CJK characters in artifact names.
- Regression tests for artifact naming + content-type mismatch scenarios.

**IMPORTANT — v8.0.0 behavioral change (if you were on v4):** v8.0.0 introduced ESM migration and a breaking default change: hash mismatches now **error** by default (previously only warned). The action also no longer blindly unzips all downloads — it checks `Content-Type` headers first. New `skip-decompress: true` parameter available. If your workflow downloads artifacts expecting the old "always unzip" behavior and you have a compressed artifact uploaded with `archive: false` in upload-artifact v7, you must account for this.
**Breaking changes from v8.0.0 to v8.0.1:** No.
**Migration steps:** Specify `v8.0.1` tag in your new workflow. Since you are writing this from scratch, also account for the v8.0.0 behavioral changes: if you need to download a file without decompression, add `skip-decompress: true`.
**Security advisories:** No CVEs found via WebSearch `"actions/download-artifact" security vulnerability CVE 2025 2026`. General artifact poisoning risk documented (using download-artifact in `workflow_run` contexts with untrusted inputs can lead to privilege escalation) — this is a workflow design issue, not an action CVE.
**Recommendation:** Pin to v8.0.1 SHA. Note the hash-mismatch-defaults-to-error behavior — this is strictly safer, no reason to suppress it.
**Your call:** Use `actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1`. Review whether your workflow uses `workflow_run` + artifact download pattern; if so, validate trust boundary.

---

### actions/cache: v5 (unspecified patch) -> v5.0.4

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/actions/cache/releases/latest` → v5.0.4 (2026-03-18); `/tags` confirms v5.0.4 as latest.
**What changed (v5.0.0 baseline to v5.0.4):**

- v5.0.0: Node 24 runtime, new cache backend v2 APIs, up to ~80% faster uploads on GitHub Hosted Runners, requires runner v2.327.1+.
- v5.0.4 (2026-03-18): Documentation updates, workflow permission fixes, resolved code scanning alerts, fixed cache key issue for `bun.lock`, dependency security updates.
**Breaking changes:** No breaking changes between v5.0.0 and v5.0.4. Changes are fully backward-compatible.
**Migration steps:** Specify `v5.0.4` in the new workflow. No config changes required.
**Security advisories:** The legacy cache backend was shut down April 15, 2025 — workflows using actions/cache v1/v2/v3 with old @actions/cache package versions will now fail. You are starting with v5 so this is not an issue. No CVEs found via WebSearch "actions/cache CVE security advisory 2025 2026". Note: caching credentials files (e.g., `~/.docker/config.json`) is a documented security anti-pattern — do not include credential files in cache paths.
**Recommendation:** Use v5.0.4 for the new workflow. It picks up security dependency updates and the bun.lock cache key fix.
**Your call:** Use `actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7 # v5.0.4`. Version bump only — no config changes needed.

---

### actions/checkout: v6 -> v6.0.2

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/actions/checkout/releases/latest` → v6.0.2 (2026-01-09); `/tags` confirms v6.0.2 as latest in the v6 series.
**What changed (v6.0.0 to v6.0.2):**

- v6.0.0 (Nov 2025): Updated default runtime to Node 24; credentials now persisted to a separate file under `$RUNNER_TEMP` (security improvement); requires runner v2.327.1+ for Docker container action scenarios.
- v6.0.2 (Jan 2026): Adds `orchestration_id` to git user-agent when `ACTIONS_ORCHESTRATION_ID` is set; fixes tag handling (preserves annotations and explicit `fetch-tags`).
**Breaking changes:** None between v6.0.0 and v6.0.2. The credential storage change in v6.0.0 is transparent to callers.
**Migration steps:** Pin to v6.0.2 tag. No workflow config changes needed.
**Security advisories:** No CVE filed directly against `actions/checkout`. CVE-2025-61671 was assigned to a Microsoft workflow that *misused* the `pull_request_target` trigger combined with `actions/checkout@v5` — the vulnerability is in the workflow design (using `contents: write` + `pull-requests: write` with `pull_request_target`), not in the action itself. If your new workflow uses `pull_request_target`, do not check out the head ref of fork PRs with elevated permissions. No advisories found via WebSearch "actions/checkout CVE security advisory 2025 2026".
**Recommendation:** Use v6.0.2. Correct version for a new workflow today.
**Your call:** Use `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2`. Version bump from the bare `@v6` tag — identical config.

---

### actions/upload-artifact: v7 -> v7.0.0

**Risk level:** ROUTINE (current)
**Verified via:** WebFetch `api.github.com/repos/actions/upload-artifact/releases/latest` → v7.0.0 (2026-02-26); `/tags` confirms v7.0.0 as latest.
**What changed:** v7.0.0 is the latest release. Key changes from v4 (in case you were migrating from an older workflow):

- v5.0.0 (Oct 2025): Preliminary Node 24 support, still ran on Node 20 by default.
- v6.0.0 (Dec 2025): Node 24 as default runtime, ESM migration, requires runner v2.327.1+.
- v7.0.0 (Feb 2026): New `archive: false` parameter — allows uploading single files without zipping. Continued ESM migration work.
**Breaking changes:** None — v7.0.0 is the latest; you are starting at current.
**Migration steps:** N/A — already at latest. Note: `upload-artifact@v7` and `download-artifact@v8` are NOT on the same major version number but they ARE compatible with each other (the backend artifact service version is what matters, not the action major version numbers).
**Security advisories:** No CVEs found via WebSearch `"actions/upload-artifact" security vulnerability CVE 2025 2026`. Operational note: do not store secrets, tokens, or credential files in artifacts — they are accessible to anyone with repo access and retained for 90 days by default.
**Recommendation:** Confirmed current. Use as-is.
**Your call:** Use `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0`. No changes needed.

---

## SHA-Pinned Workflow Snippet

Use this in your new workflow:

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

  - name: Setup Node.js
    uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
    with:
      node-version: '22'        # or your target version
      # cache: 'npm'            # optional: explicit cache config

  - name: Cache dependencies
    uses: actions/cache@668228422ae6a00e4ad889ee87cd7109ec5666a7 # v5.0.4
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

  - name: Upload artifact
    uses: actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0
    with:
      name: my-artifact
      path: dist/

  - name: Download artifact
    uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
    with:
      name: my-artifact
      path: dist/
```

Note: `actions/setup-node@v6` with `cache: 'npm'` subsumes the `actions/cache` step for npm dependency caching. If you are using both `setup-node` with caching enabled AND a separate `actions/cache` step, you may be double-caching. Choose one approach.

---

## Critical Finding: Node 20 Deprecation Deadline

All five of these actions (including the versions you specified) are affected by the Node 20 → Node 24 runtime migration:

- **April 2026:** Node 20 reaches EOL.
- **June 2, 2026:** GitHub runners will use Node 24 by default. Actions running on Node 20 (e.g., `setup-node@v4`, `cache@v4`, `upload-artifact@v4`) will be forced to Node 24, potentially with degraded or broken behavior.
- **Fall 2026:** GitHub will remove Node 20 from runners entirely.

`actions/setup-node@v4` (Node 20 runtime) specifically CANNOT be used in a new workflow targeting production beyond this deadline. `actions/setup-node@v6` (Node 24 runtime) is the correct choice.

---

## Verification Log

| Claim                                       | Tool      | Source                                                                                          | Finding                                                                                                                                                                           |
|---------------------------------------------|-----------|-------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actions/checkout latest release             | WebFetch  | `api.github.com/repos/actions/checkout/releases/latest`                                         | v6.0.2, published 2026-01-09                                                                                                                                                      |
| actions/checkout latest tags                | WebFetch  | `api.github.com/repos/actions/checkout/tags`                                                    | v6.0.2 is latest; consistent with releases                                                                                                                                        |
| actions/checkout v6.0.2 SHA                 | WebFetch  | `api.github.com/repos/actions/checkout/git/refs/tags/v6.0.2`                                    | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (type: commit, direct — no annotated tag resolution needed)                                                                            |
| actions/upload-artifact latest release      | WebFetch  | `api.github.com/repos/actions/upload-artifact/releases/latest`                                  | v7.0.0, published 2026-02-26                                                                                                                                                      |
| actions/upload-artifact latest tags         | WebFetch  | `api.github.com/repos/actions/upload-artifact/tags`                                             | v7.0.0 is latest; consistent                                                                                                                                                      |
| actions/upload-artifact v7.0.0 SHA          | WebFetch  | `api.github.com/repos/actions/upload-artifact/git/refs/tags/v7.0.0`                             | `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f` (type: commit)                                                                                                                         |
| actions/download-artifact latest release    | WebFetch  | `api.github.com/repos/actions/download-artifact/releases/latest`                                | v8.0.1, published 2026-03-11                                                                                                                                                      |
| actions/download-artifact latest tags       | WebFetch  | `api.github.com/repos/actions/download-artifact/tags`                                           | v8.0.1 is latest; consistent                                                                                                                                                      |
| actions/download-artifact v8.0.1 SHA        | WebFetch  | `api.github.com/repos/actions/download-artifact/git/refs/tags/v8.0.1`                           | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` (type: commit)                                                                                                                         |
| actions/cache latest release                | WebFetch  | `api.github.com/repos/actions/cache/releases/latest`                                            | v5.0.4, published 2026-03-18                                                                                                                                                      |
| actions/cache latest tags                   | WebFetch  | `api.github.com/repos/actions/cache/tags`                                                       | v5.0.4 is latest; consistent                                                                                                                                                      |
| actions/cache v5.0.4 SHA                    | WebFetch  | `api.github.com/repos/actions/cache/git/refs/tags/v5.0.4`                                       | `668228422ae6a00e4ad889ee87cd7109ec5666a7` (type: commit)                                                                                                                         |
| actions/setup-node latest release           | WebFetch  | `api.github.com/repos/actions/setup-node/releases/latest`                                       | v6.3.0, published 2026-03-04                                                                                                                                                      |
| actions/setup-node latest tags              | WebFetch  | `api.github.com/repos/actions/setup-node/tags`                                                  | v6.3.0 is latest; consistent                                                                                                                                                      |
| actions/setup-node v6.3.0 SHA               | WebFetch  | `api.github.com/repos/actions/setup-node/git/refs/tags/v6.3.0`                                  | `53b83947a5a98c8d113130e565377fae1a50d02f` (type: commit)                                                                                                                         |
| actions/setup-node v4.4.0 SHA (latest v4)   | WebFetch  | `api.github.com/repos/actions/setup-node/git/refs/tags/v4.4.0`                                  | `49933ea5288caeca8642d1e84afbd3f7d6820020` (type: commit)                                                                                                                         |
| Security: all five actions CVEs             | WebSearch | "GitHub Actions actions/checkout ... CVE security advisory 2025 2026"                           | No CVEs filed against GitHub's own first-party actions; CVE-2025-30066 affects tj-actions (third-party); CVE-2025-61671 is a workflow misuse pattern, not an action vulnerability |
| Security: upload/download-artifact specific | WebSearch | `"actions/upload-artifact" OR "actions/download-artifact" security vulnerability CVE 2025 2026` | No CVEs found; artifact poisoning is a workflow design risk                                                                                                                       |
| Security: checkout specific                 | WebSearch | "actions/checkout CVE security vulnerability advisory 2025 2026"                                | No CVEs against checkout itself; CVE-2025-61671 is a misuse-of-trigger issue                                                                                                      |
| setup-node v5/v6 breaking changes           | WebSearch | "actions/setup-node v5 v6 breaking changes changelog migration 2025 2026"                       | Node 20 deprecation confirmed; auto-caching behavior changes confirmed; June 2 2026 deadline confirmed                                                                            |
| cache v5 changes                            | WebSearch | "actions/cache v5 breaking changes new features deprecation 2025"                               | Legacy backend sunset Feb 1 2025; Node 24 runtime; v5 is correct current version                                                                                                  |
| upload-artifact v5/v6/v7 history            | WebFetch  | `api.github.com/repos/actions/upload-artifact/releases`                                         | Three major releases in 2025-2026; v7 is latest (Feb 2026)                                                                                                                        |
| download-artifact v7/v8 history             | WebFetch  | `api.github.com/repos/actions/download-artifact/releases`                                       | v8.0.0 Feb 2026 (ESM + hash-mismatch-errors-by-default); v8.0.1 Mar 2026 (CJK support)                                                                                            |
| checkout v6 changelog                       | WebFetch  | `api.github.com/repos/actions/checkout/releases`                                                | v6.0.0 credential storage change; v6.0.2 tag annotation fix                                                                                                                       |
| setup-node v6 releases detail               | WebFetch  | `api.github.com/repos/actions/setup-node/releases`                                              | v5-v6.3.0 changelog confirmed                                                                                                                                                     |

**Self-check:**

- Every version sourced from a live lookup? Yes.
- Both releases AND tags checked for all five actions? Yes.
- Every dependency covered by at least one security search? Yes — broad search covered all five; targeted checkout and upload/download-artifact searches run additionally.
- Changelogs read for every upgrade? Yes — setup-node (v4→v6.3.0), download-artifact (v8.0.0/v8.0.1), cache (v5.0.0→v5.0.4), checkout (v6.0.0→v6.0.2), upload-artifact (v4→v7.0.0 history).
- SHA fetched for every action? Yes — all five at their recommended pinned version. All were direct commit SHAs (no annotated tag resolution needed).
- Internal consistency: all SHA pins reference the same versions cited in the snippet and decisions table? Yes.
