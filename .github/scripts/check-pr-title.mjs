#!/usr/bin/env node
// Validates that a PR title is a valid Conventional Commit. This repo
// squash-merges, so the PR title becomes the commit subject, and
// semantic-release derives the version bump from it (see release.config.js).
//
// The accepted header pattern mirrors release.config.js exactly: an OPTIONAL
// leading gitmoji (a unicode glyph or a :shortcode:) before a REQUIRED
// conventional type. Keeping the two in sync means a title that passes this
// gate is parsed identically at release time. The one intentional difference:
// here the type must be a KNOWN conventional type, so typos like "faet:" are
// caught at PR time rather than silently producing no release.
//
//   PR_TITLE="feat: add thing" node .github/scripts/check-pr-title.mjs
const title = process.env.PR_TITLE ?? "";

// Optional leading gitmoji — unicode emoji (incl. ZWJ / variation-selector
// sequences) or a :shortcode: — same as release.config.js GITMOJI.
const GITMOJI =
  "(?:(?::\\w+:|[\\p{Extended_Pictographic}\\u200d\\uFE0F]+)\\s*)?";
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
const header = new RegExp(
  `^${GITMOJI}(?:${TYPES.join("|")})(?:\\([^)]+\\))?!?: .+`,
  "u",
);

if (!header.test(title)) {
  const message = [
    "PR title is not a valid Conventional Commit.",
    `  title:    ${title || "(empty)"}`,
    "  expected: <type>(optional-scope)!: <subject>  (an optional leading gitmoji is allowed)",
    `  types:    ${TYPES.join(", ")}`,
    "  why:      this title becomes the squash-merge commit that drives semantic-release.",
  ].join("\n");
  console.error(`::error::${message}`);
  process.exit(1);
}

console.log(`PR title OK: ${title}`);
