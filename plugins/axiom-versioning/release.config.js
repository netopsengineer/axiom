// Per-plugin semantic-release config. semantic-release-monorepo filters commits
// by this package directory and derives <package-name>-v<version> tags from
// package.json "name".
export default {
  extends: "semantic-release-monorepo",
  branches: ["main"],
  plugins: [
    ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
    [
      "@semantic-release/release-notes-generator",
      { preset: "conventionalcommits" },
    ],
    [
      "@semantic-release/changelog",
      { changelogFile: "CHANGELOG.md", changelogTitle: "# Changelog" },
    ],
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release expands this placeholder at release time; it must stay literal.
          "node ../../.github/scripts/prepare-plugin-release.mjs . ${nextRelease.version}",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: [
          ".axiom/plugin.json",
          ".claude-plugin/plugin.json",
          ".codex-plugin/plugin.json",
          "CHANGELOG.md",
        ],
        message:
          // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release expands this placeholder at release time; it must stay literal.
          "chore(release): axiom-versioning ${nextRelease.version} [skip ci]",
      },
    ],
    "@semantic-release/github",
  ],
};
