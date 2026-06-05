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
 * Multi-plugin note: this single-package config versions the whole marketplace
 * as one unit. If you later want independent per-plugin versions, split into
 * per-plugin configs (e.g. semantic-release-monorepo).
 */
const PLUGIN_DIR = "plugins/axiom-versioning";
const MANIFEST = `${PLUGIN_DIR}/.claude-plugin/plugin.json`;
const CHANGELOG = `${PLUGIN_DIR}/CHANGELOG.md`;

// Conventional Commits + gitmoji. The stock grammar requires the type at the
// very start, so a commit like "✨ feat: …" would be ignored and trigger NO
// release. These patterns allow an OPTIONAL leading gitmoji — a unicode emoji
// (incl. ZWJ / variation-selector sequences) or a :shortcode: — before the
// conventional header. The emoji is non-capturing, so the type/scope/subject
// groups and the rest of the preset's parserOpts are unchanged. A conventional
// `type:` is still required: a bare emoji with no type does not release.
const GITMOJI =
  "(?:(?::\\w+:|[\\p{Extended_Pictographic}\\u200d\\uFE0F]+)\\s*)?";
const parserOpts = {
  headerPattern: new RegExp(`^${GITMOJI}(\\w*)(?:\\((.*)\\))?!?: (.*)$`, "u"),
  breakingHeaderPattern: new RegExp(
    `^${GITMOJI}(\\w*)(?:\\((.*)\\))?!: (.*)$`,
    "u",
  ),
};

export default {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      { preset: "conventionalcommits", parserOpts },
    ],
    [
      "@semantic-release/release-notes-generator",
      { preset: "conventionalcommits", parserOpts },
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
