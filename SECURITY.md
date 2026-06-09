# Security Policy

Axiom is a marketplace of Claude Code plugins. The plugins ship Markdown skills
and configuration — they run no services of their own — but a malicious or buggy
skill can still steer what Claude Code does inside your repository, so we treat
reports seriously.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

- Preferred: open a private report through GitHub Security Advisories — the
  **"Report a vulnerability"** button on this repository's **Security** tab.
- Alternatively: email <enterprise.code.developer@gmail.com>.

Please include the affected plugin or skill, a description of the issue, and
steps to reproduce or a proof of concept. We aim to acknowledge reports within a
few business days and will keep you updated on remediation.

## Scope

In scope:

- The marketplace catalog (`.claude-plugin/marketplace.json`).
- Shipped plugins under `plugins/` (skills, references, manifests).
- The release and validation automation under `.github/`.

Out of scope:

- Eval run data under `dev/` and local scratch files — these are never shipped.
- Third-party tools, registries, or services that a plugin merely references.

## Supported versions

Only the latest released version of each plugin is supported. Fixes ship as new
releases rather than as patches to older versions.
