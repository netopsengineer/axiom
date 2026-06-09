#!/usr/bin/env node
// Validates PR source branch names. Release semantics stay tied to the PR title;
// this gate keeps human and agent branches predictable without blocking known
// automation such as Dependabot.
//
//   PR_BRANCH="chore/add-branch-name-check" node .github/scripts/check-branch-name.mjs

const branch =
  process.env.PR_BRANCH ?? process.env.BRANCH_NAME ?? process.argv[2] ?? "";

const HUMAN_BRANCH = /^(feat|fix|chore)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/u;
const AUTOMATION_BRANCHES = [
  {
    name: "Dependabot",
    pattern: /^dependabot\/.+/u,
  },
];
const MAX_SLUG_LENGTH = 64;

if (isAllowedBranch(branch)) {
  console.log(`Branch name OK: ${branch}`);
  process.exit(0);
}

const lines = [
  "Branch name does not match this repository's PR branch convention.",
  `  branch:   ${branch || "(empty)"}`,
  "  expected: feat/<short-kebab-slug>, fix/<short-kebab-slug>, or chore/<short-kebab-slug>",
  "  allowed:  dependabot/** for automated dependency updates",
  "  examples: chore/add-branch-name-check, feat/add-plugin-catalog, fix/readme-sync",
  "  why:      predictable branch names keep agent-driven shipping deterministic; release behavior still comes from the PR title.",
];

console.error(`::error::${lines.join("\n")}`);
process.exit(1);

function isAllowedBranch(candidate) {
  if (typeof candidate !== "string" || candidate.trim() !== candidate) {
    return false;
  }

  const humanMatch = HUMAN_BRANCH.exec(candidate);
  if (humanMatch) {
    const slug = humanMatch[2];
    return slug.length <= MAX_SLUG_LENGTH;
  }

  return AUTOMATION_BRANCHES.some(({ pattern }) => pattern.test(candidate));
}
