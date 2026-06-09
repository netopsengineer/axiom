#!/usr/bin/env node
// Validates that a PR title is a valid Conventional Commit. This repo
// squash-merges, so the PR title becomes the commit subject, and
// per-plugin semantic-release configs derive version bumps from it.
//
// Per the Conventional Commits spec the type is the PREFIX of the header —
// nothing may precede it — and the description follows the colon and space. So
// a gitmoji, if used at all, belongs AFTER the colon as the start of the
// subject (`feat(scope): ✨ subject`), never before the type (`✨ feat: ...`).
// This gate enforces type-first; semantic-release's default parser agrees.
//
//   PR_TITLE="feat: add thing" node .github/scripts/check-pr-title.mjs
const title = process.env.PR_TITLE ?? "";

const TYPES = [
  "feat",
  "fix",
  "perf",
  "docs",
  "style",
  "refactor",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];
const TYPE = `(?:${TYPES.join("|")})`;

// Canonical header: type is the prefix, optional (scope), optional !, ": ".
const header = new RegExp(`^${TYPE}(?:\\([^)]+\\))?!?: .+`, "u");
// The specific mistake we reject with a tailored hint: a gitmoji (unicode glyph
// or :shortcode:) placed BEFORE the type instead of after the colon.
const leadingGitmoji = new RegExp(
  `^(?::\\w+:|[\\p{Extended_Pictographic}\\u200d\\uFE0F]+)\\s*${TYPE}(?:\\([^)]+\\))?!?: .+`,
  "u",
);

if (header.test(title)) {
  console.log(`PR title OK: ${title}`);
  process.exit(0);
}

const lines = leadingGitmoji.test(title)
  ? [
      "PR title puts a gitmoji before the type.",
      `  title:    ${title}`,
      "  fix:      move the emoji after the colon — `feat: ✨ subject`, not `✨ feat: subject`.",
      "  why:      Conventional Commits requires the type to be the header prefix (nothing before it).",
    ]
  : [
      "PR title is not a valid Conventional Commit.",
      `  title:    ${title || "(empty)"}`,
      "  expected: <type>(optional-scope)!: <subject>  (a gitmoji, if any, goes after the colon)",
      `  types:    ${TYPES.join(", ")}`,
      "  why:      this title becomes the squash-merge commit that drives semantic-release.",
    ];
console.error(`::error::${lines.join("\n")}`);
process.exit(1);
