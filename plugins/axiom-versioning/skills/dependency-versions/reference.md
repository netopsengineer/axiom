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
