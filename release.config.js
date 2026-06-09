/**
 * semantic-release configuration for the axiom marketplace.
 *
 * Releases are driven by Conventional Commits on `main`. There is no npm
 * publish — the marketplace *is* the git repo — so a release only:
 *   1. bumps "version" in the plugin manifest,
 *   2. prepends release notes to the plugin CHANGELOG,
 *   3. commits both back with [skip ci],
 *   4. tags vX.Y.Z and cuts a GitHub Release.
 *
 * Commit types: feat -> minor, fix/perf -> patch,
 * `feat!:` or a `BREAKING CHANGE:` footer -> major. chore/ci/docs/etc. -> none.
 *
 * Commit convention: stock Conventional Commits, so the type is the header
 * prefix — nothing precedes it. A gitmoji, if used, goes AFTER the colon as the
 * start of the subject (`feat: ✨ ...`), where the default parser treats it as
 * plain subject text. The `Conventional Commit title` PR check enforces this,
 * so no custom parserOpts are needed here.
 *
 * Multi-plugin note: this single-package config versions the whole marketplace
 * as one unit. If you later want independent per-plugin versions, split into
 * per-plugin configs (e.g. semantic-release-monorepo).
 */
const PLUGIN_DIR = "plugins/axiom-versioning";
const MANIFEST = `${PLUGIN_DIR}/.claude-plugin/plugin.json`;
const CHANGELOG = `${PLUGIN_DIR}/CHANGELOG.md`;

export default {
  branches: ["main"],
  plugins: [
    ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
    [
      "@semantic-release/release-notes-generator",
      { preset: "conventionalcommits" },
    ],
    [
      "@semantic-release/changelog",
      { changelogFile: CHANGELOG, changelogTitle: "# Changelog" },
    ],
    [
      "@semantic-release/exec",
      // `${nextRelease.version}` is interpolated by semantic-release at runtime,
      // so it must remain a plain string (NOT a JS template literal).
      {
        prepareCmd:
          "node .github/scripts/sync-plugin-version.mjs " +
          MANIFEST +
          // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release expands this placeholder at release time; it must stay a literal.
          " ${nextRelease.version}",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: [MANIFEST, CHANGELOG],
        message:
          // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release expands these placeholders at release time; they must stay literal.
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    "@semantic-release/github",
  ],
};
