# Changelog

## [axiom-versioning-v1.1.1](https://github.com/netopsengineer/axiom/compare/axiom-versioning-v1.1.0...axiom-versioning-v1.1.1) (2026-07-07)

## [axiom-versioning-v1.1.0](https://github.com/netopsengineer/axiom/compare/axiom-versioning-v1.0.2...axiom-versioning-v1.1.0) (2026-07-07)

## [axiom-versioning-v1.0.2](https://github.com/netopsengineer/axiom/compare/axiom-versioning-v1.0.1...axiom-versioning-v1.0.2) (2026-06-16)

### Bug Fixes

* **dependency-versions:** trim description under 1024-char load limit ([#22](https://github.com/netopsengineer/axiom/issues/22)) ([3e3b469](https://github.com/netopsengineer/axiom/commit/3e3b4691b9b5454e4c7ff5654d8c9da129397863))

## [1.0.1](https://github.com/netopsengineer/axiom/compare/v1.0.0...v1.0.1) (2026-06-05)

### Bug Fixes

* drop hardcoded years from the CVE search example ([#1](https://github.com/netopsengineer/axiom/issues/1)) ([c28b50b](https://github.com/netopsengineer/axiom/commit/c28b50bad6388e3db9e60d7b11ca72100f8ba90e))
* restore the CVE-search example to its evaluated wording ([#2](https://github.com/netopsengineer/axiom/issues/2)) ([2e12a10](https://github.com/netopsengineer/axiom/commit/2e12a10a0d247749857c7818fa1bdcdfd92acb1e))

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
