# Axiom

[![Built for Claude Code](https://img.shields.io/badge/Built_for-Claude_Code-D97757?style=for-the-badge&logo=claude&logoColor=white&labelColor=1a1a1a)](https://docs.claude.com/en/docs/claude-code)
[![Marketplace](https://img.shields.io/github/actions/workflow/status/netopsengineer/axiom/validate.yml?branch=main&style=for-the-badge&logo=anthropic&logoColor=white&label=Marketplace&labelColor=1a1a1a)](https://github.com/netopsengineer/axiom/actions/workflows/validate.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/netopsengineer/axiom/release.yml?branch=main&style=for-the-badge&logo=semanticrelease&logoColor=white&label=Release&labelColor=1a1a1a)](https://github.com/netopsengineer/axiom/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-3fb950?style=for-the-badge&labelColor=1a1a1a)](https://opensource.org/licenses/MIT)

<!-- plugin-badges:start -->
[![axiom-git](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnetopsengineer%2Faxiom%2Fmain%2Fplugins%2Faxiom-git%2F.claude-plugin%2Fplugin.json&query=%24.version&prefix=v&label=axiom-git&style=for-the-badge&logo=claude&logoColor=white&color=8957e5&labelColor=1a1a1a)](plugins/axiom-git/CHANGELOG.md)
[![axiom-versioning](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnetopsengineer%2Faxiom%2Fmain%2Fplugins%2Faxiom-versioning%2F.claude-plugin%2Fplugin.json&query=%24.version&prefix=v&label=axiom-versioning&style=for-the-badge&logo=claude&logoColor=white&color=8957e5&labelColor=1a1a1a)](plugins/axiom-versioning/CHANGELOG.md)
<!-- plugin-badges:end -->

> **Claude Code plugins, built from first principles.**

Axiom is a curated marketplace of plugins for Claude Code - solid ground for
whatever you're building.

## Backed by evals, not vibes

Every plugin in Axiom earns its place. Before anything ships, it's
measured against real task scenarios with graded, repeatable evals - so what you
install is backed by empirical data, not good intentions. No toys, no vibe-coded
filler, no tokens burned on output that doesn't move the needle. If it can't be
measured, it doesn't ship.

Want receipts? Each plugin keeps a scored eval history in its own README, and
the index below is generated so new plugin evals surface here automatically.

<!-- eval-index:start -->
The eval index is generated from `.claude-plugin/marketplace.json` and each
shipped skill's `evals/evals.json` manifest. Plugin READMEs are the canonical
scored histories.

| Plugin                                                 | Evaluated skill manifests                                                                   | Scenarios | Manifest expectations | Scored history                                                  |
|--------------------------------------------------------|---------------------------------------------------------------------------------------------|----------:|----------------------:|-----------------------------------------------------------------|
| [axiom-git](plugins/axiom-git/README.md)               | [commit-message](plugins/axiom-git/skills/commit-message/evals/evals.json)                  |         6 |                    24 | [Eval history](plugins/axiom-git/README.md#eval-history)        |
| [axiom-versioning](plugins/axiom-versioning/README.md) | [dependency-versions](plugins/axiom-versioning/skills/dependency-versions/evals/evals.json) |         5 |                    25 | [Eval history](plugins/axiom-versioning/README.md#eval-history) |

Current coverage: **2 plugins**, **2 evaluated skills**,
**11 scenarios**, **49 manifest expectations**.
<!-- eval-index:end -->

## Add the marketplace

```shell
/plugin marketplace add netopsengineer/axiom
```

Plugin sources in this marketplace use relative paths, which resolve only when
the marketplace is added from a Git host (GitHub, GitLab, or a git URL) - not
from a direct URL to `marketplace.json`.

## Plugins

<!-- plugin-list:start -->
### [axiom-git](plugins/axiom-git/README.md)

Composes Conventional Commits messages with gitmoji from the staged diff, with safety
gates for protected branches, staged secrets, and pre-commit hooks.

Category: `version-control`

```shell
/plugin install axiom-git@axiom
```

### [axiom-versioning](plugins/axiom-versioning/README.md)

Audits and updates external versioned dependencies across application, infrastructure,
and CI/CD configurations.

Category: `dependency-management`

```shell
/plugin install axiom-versioning@axiom
```
<!-- plugin-list:end -->

## Repo layout

```text
.claude-plugin/marketplace.json   # Marketplace catalog (lists all plugins)
plugins/<name>/                   # One directory per plugin (its own plugin.json)
dev/<name>/                       # Eval run data, not shipped with the plugin
```

## Contributing

Local setup, commit conventions, the release process, and CI/CD - see
[CONTRIBUTING.md](CONTRIBUTING.md).
