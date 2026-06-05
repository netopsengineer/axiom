# Pre-Commit Hook Version Audit

**Audit date:** 2026-03-20
**Config file:** `.pre-commit-config.yaml`

---

## Summary

All 6 hooks were checked against their live GitHub repositories. No security advisories were found for any hook. Three hooks are behind their latest release.

| Hook repo                       | Configured | Latest  | Status                  |
|---------------------------------|------------|---------|-------------------------|
| pre-commit/pre-commit-hooks     | v6.0.0     | v6.0.0  | Up to date              |
| pre-commit/sync-pre-commit-deps | v0.0.3     | v0.0.3  | Up to date              |
| streetsidesoftware/cspell-cli   | v9.6.0     | v9.7.0  | Minor update available  |
| DavidAnson/markdownlint-cli2    | v0.21.0    | v0.21.0 | Up to date              |
| biomejs/pre-commit              | v2.4.4     | v2.4.8  | 4 patch versions behind |
| gitleaks/gitleaks               | v8.30.0    | v8.30.1 | 1 patch behind          |

---

## Hook-by-Hook Details

### 1. pre-commit/pre-commit-hooks — v6.0.0 (CURRENT)

- **Configured:** v6.0.0
- **Latest:** v6.0.0 (released August 9, 2024)
- **Status:** Up to date
- **Security advisories:** None published
- **Notes:** v6.0.0 dropped Python < 3.9 support and removed the deprecated `check-byte-order-marker` hook (replaced by `fix-byte-order-marker`, which this config already uses correctly). No action needed.

---

### 2. pre-commit/sync-pre-commit-deps — v0.0.3 (CURRENT)

- **Configured:** v0.0.3
- **Latest:** v0.0.3 (released January 20, 2025)
- **Status:** Up to date
- **Security advisories:** None published
- **Notes:** This is a small utility repo with only 3 tags total (v0.0.1, v0.0.2, v0.0.3). No action needed.

---

### 3. streetsidesoftware/cspell-cli — v9.6.0 (BEHIND)

- **Configured:** v9.6.0
- **Latest:** v9.7.0 (released February 23, 2026)
- **Status:** 1 minor version behind
- **Security advisories:** None published
- **Notes:** v9.7.0 updates the CSpell engine to 9.7.0 and includes incremental patch updates (9.6.3, 9.6.4 were skipped). Not a security issue, but upgrading is recommended to pick up the latest spell-check engine improvements and bug fixes.

**Recommended action:** Update to `rev: v9.7.0`

---

### 4. DavidAnson/markdownlint-cli2 — v0.21.0 (CURRENT)

- **Configured:** v0.21.0
- **Latest:** v0.21.0 (released February 15, 2026)
- **Status:** Up to date
- **Security advisories:** None published
- **Notes:** No action needed.

---

### 5. biomejs/pre-commit — v2.4.4 (BEHIND)

- **Configured:** v2.4.4
- **Latest:** v2.4.8 (released March 19, 2026)
- **Status:** 4 patch versions behind — most outdated hook in the config
- **Security advisories:** None published
- **Intermediate versions skipped:**
    - v2.4.5 (March 3, 2026)
    - v2.4.6 (March 6, 2026)
    - v2.4.7 (March 14, 2026)
    - v2.4.8 (March 19, 2026)
- **Notes:** All four missed versions are patch releases that bump the bundled `@biomejs/biome` dependency. Being multiple patch versions behind means the linter and formatter rules being applied may differ from the current Biome release, potentially causing divergence from the project's intended code style. This is the most outdated hook relative to the release cadence. Not a security issue, but worth updating promptly to avoid lint rule drift.

**Recommended action:** Update to `rev: v2.4.8`

---

### 6. gitleaks/gitleaks — v8.30.0 (BEHIND)

- **Configured:** v8.30.0
- **Latest:** v8.30.1 (released March 21, 2026)
- **Status:** 1 patch version behind
- **Security advisories:** None published on the GitHub advisory page
- **Notes:** v8.30.1 is a maintenance patch (goreleaser config update, report template cleanup, Go 1.24 build switch). For a secrets scanner, running the latest patch version is best practice even when there are no disclosed CVEs, as detection rule updates ship with each release. The gap here is small (1 patch) and there are no known security issues with v8.30.0, but this is a security-critical tool so timely updates are recommended.

  **Additional context:** The original Gitleaks creator has launched a successor project called **Betterleaks** (reached v1.1.1 as of March 2026), marketed as a faster, more accurate drop-in replacement using Token Efficiency instead of Shannon entropy for candidate secret detection. This is not an immediate action item, but worth monitoring if you evaluate long-term secrets scanning tooling.

**Recommended action:** Update to `rev: v8.30.1`

---

## Security Findings

**No CVEs, GitHub security advisories, or known exploited vulnerabilities were found for any of the six hooks as of 2026-03-20.**

Each repository's GitHub Security Advisories page was checked directly and all returned "There aren't any published security advisories." No active security flags were found via web search either.

---

## Recommended Changes to `.pre-commit-config.yaml`

Three hooks need version bumps:

```yaml
# streetsidesoftware/cspell-cli: v9.6.0 -> v9.7.0
  - repo: https://github.com/streetsidesoftware/cspell-cli
    rev: v9.7.0

# biomejs/pre-commit: v2.4.4 -> v2.4.8 (4 patches behind — highest priority)
  - repo: https://github.com/biomejs/pre-commit
    rev: v2.4.8

# gitleaks/gitleaks: v8.30.0 -> v8.30.1 (security tool — update promptly)
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
```

After editing, validate with:

```bash
pre-commit run --all-files
```

---

## Sources Consulted

- <https://github.com/pre-commit/pre-commit-hooks/releases/latest>
- <https://github.com/pre-commit/pre-commit-hooks/security/advisories>
- <https://github.com/pre-commit/sync-pre-commit-deps/tags>
- <https://github.com/streetsidesoftware/cspell-cli/releases>
- <https://github.com/streetsidesoftware/cspell-cli/security/advisories>
- <https://github.com/DavidAnson/markdownlint-cli2/tags>
- <https://github.com/DavidAnson/markdownlint-cli2/security/advisories>
- <https://github.com/biomejs/pre-commit/tags>
- <https://github.com/biomejs/pre-commit/security/advisories>
- <https://github.com/gitleaks/gitleaks/releases>
- <https://github.com/gitleaks/gitleaks/security/advisories>
