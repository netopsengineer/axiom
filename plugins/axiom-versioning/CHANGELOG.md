# Changelog

## 1.0.0 (2026-05-26)

### Added

- `dependency-versions` skill: audits and updates external versioned
  dependencies across application, infrastructure, and CI/CD configs.
- Live version verification via GitHub API, PyPI, npm.
- Both `/releases/latest` and `/tags` checked (they diverge).
- Security/CVE advisory search for every dependency.
- SHA pinning for GitHub Actions with annotated tag resolution.
- Structured decision format (risk level, verified via, what changed,
  breaking changes, migration steps, security advisories, recommendation).
- Dual-finding rule: stale versions with false labels get both a version
  delta and a CORRECTION entry.
- Verification log table with self-check for every report.
- Review vs implementation mode detection.
- Changelog review for every upgrade path.
- Coordinated upgrade group detection.
