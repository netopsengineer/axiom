# Dependency Versions Reference

## Tool Patterns

### Version verification (GitHub)

```plaintext
# Formal releases (may lag behind tags)
WebFetch: https://api.github.com/repos/{owner}/{repo}/releases/latest

# All tags (may be ahead of formal releases)
WebFetch: https://api.github.com/repos/{owner}/{repo}/tags

# Commit SHA for a specific tag (for SHA pinning)
WebFetch: https://api.github.com/repos/{owner}/{repo}/git/refs/tags/{tag}

# If response has "object": {"type": "tag"} (annotated tag), the SHA is a tag
# object, not a commit. Resolve it with a second fetch:
WebFetch: https://api.github.com/repos/{owner}/{repo}/git/tags/{tag-object-sha}
# The object.sha in that response is the commit SHA to use for pinning.
```

### Version verification (package registries)

```plaintext
# PyPI
WebFetch: https://pypi.org/pypi/{package-name}/json

# npm
WebFetch: https://registry.npmjs.org/{package-name}/latest
```

### Security checking

Prefer the bundled scanner — it batches every dependency into one deterministic
OSV.dev call (GHSA/PYSEC/CVE), so you get a hard per-package verdict instead of
judging search snippets:

```bash
# One call covers all deps. Spec: ecosystem:name[@version]
python3 scripts/osv_scan.py npm:lodash@4.17.15 pypi:requests@2.19.1 \
  "gha:tj-actions/changed-files@v44"

# Or feed a JSON manifest (list of {ecosystem, name, version}):
python3 scripts/osv_scan.py --json deps.json
python3 scripts/osv_scan.py --format json npm:minimist@1.2.5   # machine-readable
```

Output legend:

- `[VULNERABLE]` — a registry package (npm, PyPI, Go, crates.io, …) whose exact
  version matches an advisory. Real hit for your pin.
- `[REVIEW]` — a GitHub Action with advisories. OSV can't range-match action
  tags, so it lists every advisory with its affected range; compare your pinned
  tag against that range to decide if you're affected.
- `[CLEAN]` — no advisories for the queried version.

For each flagged advisory, open it to confirm real-world impact:

```plaintext
WebFetch: https://osv.dev/vulnerability/{advisory-id}
```

Exit codes: `0` ran (read stdout), `2` usage error, `3` OSV unreachable —
fall back to the WebSearch method below. Use the fallback whenever the script
can't help (offline/air-gapped, unsupported ecosystem, or you need deeper
context than an advisory ID):

```plaintext
WebSearch: "{package-name} CVE 2025 2026"
WebSearch: "{package-name} security advisory"
WebFetch: https://github.com/advisories?query={package-name}
```

### Library documentation

```plaintext
context7: resolve-library-id("{library-name}") then query-docs()
```

### GitHub MCP tools (when available)

```plaintext
get_latest_release(owner, repo)
list_tags(owner, repo)
get_file_contents(owner, repo, path: "CHANGELOG.md")
```

## Common Pitfalls (from empirical testing)

### Tags vs Releases divergence

GitHub `/releases/latest` only returns formal GitHub Releases. Many projects push
tags without creating releases. In testing, biomejs/pre-commit `/releases/latest`
returned v0.6.1 (Dec 2024) while `/tags` showed v2.4.8 (Mar 2026). The gitleaks
repo had a v8.30.1 tag with no corresponding release entry. Always check both.

### Confirmation bias in search

When verifying, search for CHANGES not for what you expect:

- BAD: "how to configure X" (finds old tutorials confirming stale knowledge)
- GOOD: "X changelog", "X migration guide", "X breaking changes since vN"

### Partial verification halo

Confirming a version exists is NOT confirming your plan works with it. If you plan
to use a specific API, config key, or CLI flag, verify THAT specifically — not just
the version number. In testing, the blind agent confirmed `cosign-installer@v4.1.0`
exists but didn't discover it was a SECURITY-level upgrade (CVE-2026-24122).

### Source quality hierarchy

1. GitHub API / official release pages (authoritative)
2. Official changelogs/migration guides (authoritative for changes)
3. Package registry metadata — npm, PyPI (authoritative for existence)
4. Official documentation sites (near-authoritative, can lag)
5. Blog posts / tutorials (may be outdated, cross-reference)
6. Stack Overflow (high staleness risk, verify independently)

### Coordinated upgrade groups

Some dependencies must move together. In testing, all docker/* GHA actions (build-
push-action, setup-buildx-action, login-action, metadata-action) released breaking
v7/v4/v4/v6 updates on the same day with shared Node 24/ESM migration. Upgrading
one without the others would break the workflow. Look for these patterns.

### Mutable tag supply-chain risk

After tj-actions/changed-files (CVE-2025-30066), SHA pinning is mandatory for
GitHub Actions in production workflows. Fetch SHAs via:
`api.github.com/repos/{owner}/{repo}/git/refs/tags/{tag}`

### OSV can't range-match GitHub Actions tags

Empirically: `osv_scan.py "gha:tj-actions/changed-files@v44"` with an explicit
version returns CLEAN even though CVE-2025-30066 affects everything through
45.0.7. OSV keys the GitHub Actions ecosystem on release semver and does not
resolve moving tags, so a versioned query silently under-reports (a dangerous
false CLEAN). That is why the scanner queries actions at package level and labels
them `[REVIEW]`, printing each advisory's affected range (`introduced` / `fixed`)
so you can judge your pin yourself. Registry ecosystems (npm, PyPI, Go, …) do not
have this problem — their versioned queries match precisely.

### Advisory aliases can describe different fix generations

An OSV or GHSA record can list an older CVE for the original vulnerability and
a newer CVE for an incomplete fix, bypass, or regression. The aliases share an
aggregator record, but they are not interchangeable in an affected-version
claim. A package version can have fixed the original CVE while remaining
vulnerable to the newer finding.

For every multi-alias advisory:

1. Fetch the aggregator advisory and each linked CVE record.
2. Compare publication dates, descriptions, affected ranges, and fixed versions.
3. Cite the aggregator ID and the CVE that describes the current applicable
   flaw.
4. Do not cite the historical CVE as active when the pinned version already
   fixed it. Describe the incomplete prior fix without reattaching the old ID.
5. If the sources do not disambiguate the aliases, omit the CVE and report the
   aggregator ID with the CVE mapping marked `[UNVERIFIED]`.

Never choose an advisory identifier by array order, apparent familiarity, or
training-data recall.

## Dual-Finding Pattern

When a stale version also carries a false label, generate both findings. Neither
replaces the other — they answer different questions for different readers.

### actions/upload-artifact: v2 -> v7.0.0

**Risk level:** DEPRECATION
**Verified via:** WebFetch `api.github.com/repos/actions/upload-artifact/releases/latest`
**What changed:** v2 deprecated June 30, 2024. Artifact uploads now error since
Jan 30, 2025. v4+ adds immutability; v7 adds direct-upload.
**Breaking changes:** Yes — duplicate artifact name uploads now 409 Conflict.
**Migration steps:** Pin to `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7.0.0`
**Security advisories:** None found via "actions/upload-artifact CVE 2025 2026"
**Recommendation:** Immediate upgrade — workflows have been failing since Jan 2025.
**Your call:** Upgrade now.

### "upload-artifact described as 'the latest stable release'": CORRECTION

**Risk level:** CORRECTION
**What is stated:** The plan reads: `actions/upload-artifact@v2 (the latest stable release)`
**What is correct:** v2 was deprecated June 30, 2024. The current latest is v7.0.0. The label "latest stable release" is factually false by nearly 3 years.
**Why it matters:** A maintainer reading the label without checking the version would believe no upgrade is needed. The false label actively misleads future readers and erodes trust in the plan's accuracy.
**Fix:** Change `(the latest stable release)` to `(deprecated — upgrade to v7.0.0; see version delta above)`.

The DEPRECATION finding and the CORRECTION finding coexist. The version delta is
not sufficient — anyone scanning for CORRECTION items to audit documentation
accuracy would miss the false label entirely if it is only in the DEPRECATION block.

## Decision Format Example

### sigstore/cosign-installer: v3.7.0 -> v4.1.0

**Risk level:** SECURITY
**Verified via:** WebFetch `api.github.com/repos/sigstore/cosign-installer/releases/latest` (Mar 9, 2026)
**What changed:** Bundles cosign v3.0.5 which fixes CVE-2026-24122 (expired intermediate
certificates not properly checked when transparency log verification is skipped).
**Breaking changes:** No — standard signing usage is unaffected.
**Migration steps:** Version bump + update SHA pin. Old:
`sigstore/cosign-installer@old-sha # v3.7.0`. New:
`sigstore/cosign-installer@ba7bc0a3fef59531c69a25acd34668d6d3fe6f22 # v4.1.0`
**Security advisories:** CVE-2026-24122 (GHSA-wfqv-66vq-46rm) — MEDIUM severity.
**Recommendation:** Mandatory upgrade. This is a security scanner — keeping it
current is baseline hygiene.
**Your call:** Upgrade immediately. No reason to defer.

### biomejs/pre-commit: v2.4.4 -> v2.4.8

**Risk level:** ROUTINE
**Verified via:** WebFetch `api.github.com/repos/biomejs/pre-commit/tags` (Mar 19, 2026).
Note: `/releases/latest` returns stale v0.6.1 — tags are the authoritative source.
**What changed:** 4 patch bumps tracking @biomejs/biome. New nursery lint rules
(opt-in, not enabled by default). Bug fixes for Vue/Svelte/Astro.
**Breaking changes:** No
**Migration steps:** Version bump only. No biome.json changes needed.
**Security advisories:** None found via WebSearch "biomejs biome CVE 2025 2026"
**Recommendation:** Update. Zero risk, picks up bug fixes.
**Your call:** Include in this batch or defer?
