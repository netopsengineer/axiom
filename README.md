# Axiom

[![Built for Claude Code](https://img.shields.io/badge/Built_for-Claude_Code-D97757?style=for-the-badge&logo=claude&logoColor=white&labelColor=1a1a1a)](https://docs.claude.com/en/docs/claude-code)
[![semantic-release](https://img.shields.io/badge/release-semantic-e10079?style=for-the-badge&logo=semanticrelease&logoColor=white&labelColor=1a1a1a)](https://github.com/semantic-release/semantic-release)
[![Latest release](https://img.shields.io/github/v/release/netopsengineer/axiom?style=for-the-badge&logo=github&logoColor=white&label=Release&color=8957e5&labelColor=1a1a1a)](https://github.com/netopsengineer/axiom/releases)
[![Validate](https://img.shields.io/github/actions/workflow/status/netopsengineer/axiom/validate.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI&labelColor=1a1a1a)](https://github.com/netopsengineer/axiom/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-3fb950?style=for-the-badge&labelColor=1a1a1a)](https://opensource.org/licenses/MIT)

> **Claude Code plugins, built from first principles.**

Axiom is a curated marketplace of plugins for Claude Code - solid ground for
whatever you're building.

## Backed by evals, not vibes

Every plugin in Axiom earns its place. Before anything ships, it's
measured against real task scenarios with graded, repeatable evals - so what you
install is backed by empirical data, not good intentions. No toys, no vibe-coded
filler, no tokens burned on output that doesn't move the needle. If it can't be
measured, it doesn't ship.

Want receipts? [axiom-versioning's eval results](plugins/axiom-versioning/README.md#eval-history)
show a **47% no-skill baseline lifted to 100% task accuracy across three measured
iterations**.

## Add the marketplace

```shell
/plugin marketplace add netopsengineer/axiom
```

Plugin sources in this marketplace use relative paths, which resolve only when
the marketplace is added from a Git host (GitHub, GitLab, or a git URL) - not
from a direct URL to `marketplace.json`.

## Plugins

### [axiom-versioning](plugins/axiom-versioning/README.md)

Audit and update external versioned dependencies across application,
infrastructure, and CI/CD configurations.

```shell
/plugin install axiom-versioning@axiom
```

## Repo layout

```text
.claude-plugin/marketplace.json   # Marketplace catalog (lists all plugins)
plugins/<name>/                   # One directory per plugin (its own plugin.json)
dev/<name>/                       # Eval run data, not shipped with the plugin
```

## Contributing

Local setup, commit conventions, the release process, and CI/CD - see
[CONTRIBUTING.md](CONTRIBUTING.md).
