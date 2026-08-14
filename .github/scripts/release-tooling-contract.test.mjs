import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateNotes } from "@semantic-release/release-notes-generator";
import { parse as parseYaml } from "yaml";
import {
  extractGeneratedBody,
  fillEmptyReleaseSection,
  findEmptyReleaseSections,
} from "./backfill-plugin-changelog.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DISABLED_NPM_PUBLISHER =
  "file:.github/release-tooling/semantic-release-npm-disabled";

test("semantic-release uses the fail-closed local npm publisher", async () => {
  const packageRecord = await readJson("package.json");
  assert.equal(
    packageRecord.devDependencies["@semantic-release/npm"],
    DISABLED_NPM_PUBLISHER,
  );
  assert.equal(
    packageRecord.overrides["semantic-release"]["@semantic-release/npm"],
    "$@semantic-release/npm",
  );

  const disabledPublisher = await import(
    pathToFileURL(
      path.join(
        ROOT,
        ".github/release-tooling/semantic-release-npm-disabled/index.js",
      ),
    )
  );
  for (const hook of ["verifyConditions", "prepare", "publish", "addChannel"]) {
    await assert.rejects(
      disabledPublisher[hook](),
      /npm publication is disabled in axiom/u,
    );
  }
});

test("every shipped plugin has an explicit non-npm release pipeline", async () => {
  for (const plugin of ["axiom-git", "axiom-versioning"]) {
    const moduleUrl = pathToFileURL(
      path.join(ROOT, "plugins", plugin, "release.config.js"),
    );
    const configuration = (await import(moduleUrl)).default;
    assert.ok(Array.isArray(configuration.plugins));
    assert.ok(configuration.plugins.length > 0);
    assert.equal(
      configuration.plugins.some((entry) =>
        Array.isArray(entry)
          ? entry[0] === "@semantic-release/npm"
          : entry === "@semantic-release/npm",
      ),
      false,
    );
  }
});

test("the release-note preset renders every releasing commit family", async () => {
  const packageRecord = await readJson("package.json");
  assert.equal(
    packageRecord.devDependencies["conventional-changelog-conventionalcommits"],
    "9.3.1",
  );

  const cases = [
    {
      message: "feat: add marketplace support",
      expected: [/### Features/u, /add marketplace support/u],
    },
    {
      message: "fix(api): correct validation",
      expected: [/### Bug Fixes/u, /api:/u, /correct validation/u],
    },
    {
      message: "feat!: remove a legacy manifest",
      expected: [/BREAKING CHANGES/u, /remove a legacy manifest/u],
    },
    {
      message:
        "feat(api): change behavior\n\nBREAKING CHANGE: the old API is removed",
      expected: [/BREAKING CHANGES/u, /the old API is removed/u],
    },
  ];

  for (const plugin of ["axiom-git", "axiom-versioning"]) {
    const moduleUrl = pathToFileURL(
      path.join(ROOT, "plugins", plugin, "release.config.js"),
    );
    const configuration = (await import(moduleUrl)).default;
    const releaseNotesEntry = configuration.plugins.find(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === "@semantic-release/release-notes-generator",
    );
    assert.ok(releaseNotesEntry);
    assert.deepEqual(releaseNotesEntry[1], {
      preset: "conventionalcommits",
      presetConfig: {},
    });

    for (const fixture of cases) {
      const notes = await generateNotes(releaseNotesEntry[1], {
        commits: [
          {
            hash: "38399bc12861a1db9cfa75c1ff29c92fe9f955b1",
            message: fixture.message,
          },
        ],
        cwd: path.join(ROOT, "plugins", plugin),
        lastRelease: { gitTag: `${plugin}-v1.0.0` },
        nextRelease: {
          gitTag: `${plugin}-v1.1.0`,
          version: `${plugin}-v1.1.0`,
        },
        options: {
          repositoryUrl: "https://github.com/netopsengineer/axiom.git",
        },
      });
      for (const expected of fixture.expected) {
        assert.match(notes, expected, `${plugin}: ${fixture.message}`);
      }
    }
  }
});

test("every committed plugin changelog release has generated content", async () => {
  const expectations = new Map([
    [
      "axiom-git",
      new Map([
        [
          "axiom-git-v1.1.0",
          [
            /### Features/u,
            /add native Codex marketplace support/u,
            /38399bc/u,
          ],
        ],
      ]),
    ],
    [
      "axiom-versioning",
      new Map([
        [
          "axiom-versioning-v1.1.0",
          [
            /### Features/u,
            /Add batched OSV\.dev vulnerability scanning/u,
            /77acaef/u,
          ],
        ],
        [
          "axiom-versioning-v1.1.1",
          [
            /### Bug Fixes/u,
            /harden OSV scanner typing contracts/u,
            /9485a9d/u,
          ],
        ],
        [
          "axiom-versioning-v1.2.0",
          [
            /### Features/u,
            /add native Codex marketplace support/u,
            /38399bc/u,
          ],
        ],
      ]),
    ],
  ]);

  for (const [plugin, releaseExpectations] of expectations) {
    const changelog = await readFile(
      path.join(ROOT, "plugins", plugin, "CHANGELOG.md"),
      "utf8",
    );
    assert.deepEqual(findEmptyReleaseSections(changelog), []);

    for (const [releaseTag, patterns] of releaseExpectations) {
      const section = extractChangelogSection(changelog, releaseTag);
      for (const pattern of patterns) {
        assert.match(section, pattern, `${plugin}: ${releaseTag}`);
      }
    }
  }
});

test("changelog backfill helpers reject missing output and preserve headings", () => {
  assert.throws(
    () =>
      extractGeneratedBody("## [plugin-v1.1.0](compare)\n", "plugin-v1.1.0"),
    /generated an empty release body/u,
  );

  const empty =
    "# Changelog\n\n## [plugin-v1.1.0](compare) (2026-08-14)\n\n## plugin-v1.0.0 (2026-01-01)\n\n### Features\n\n* initial release\n";
  const filled = fillEmptyReleaseSection({
    changelogText: empty,
    generatedBody: "### Features\n\n* repaired release",
    releaseTag: "plugin-v1.1.0",
  });
  assert.match(
    filled,
    /## \[plugin-v1\.1\.0\]\(compare\) \(2026-08-14\)\n\n### Features\n\n\* repaired release/u,
  );
  assert.deepEqual(findEmptyReleaseSections(filled), []);
  assert.throws(
    () =>
      fillEmptyReleaseSection({
        changelogText: filled,
        generatedBody: "### Features\n\n* duplicate repair",
        releaseTag: "plugin-v1.1.0",
      }),
    /already has a non-empty release body/u,
  );
});

test("Dependabot preserves the release-note compatibility boundary", async () => {
  const dependabot = parseYaml(
    await readFile(path.join(ROOT, ".github/dependabot.yml"), "utf8"),
  );
  const npmUpdate = dependabot.updates.find(
    (update) => update["package-ecosystem"] === "npm",
  );
  assert.ok(npmUpdate);
  assert.deepEqual(npmUpdate.ignore, [
    {
      "dependency-name": "conventional-changelog-conventionalcommits",
      "update-types": ["version-update:semver-major"],
    },
  ]);
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function extractChangelogSection(changelog, releaseTag) {
  const headings = [...changelog.matchAll(/^## .+$/gmu)];
  const targetIndex = headings.findIndex(({ 0: heading }) =>
    heading.includes(`[${releaseTag}]`),
  );
  assert.notEqual(targetIndex, -1, `${releaseTag}: missing changelog section`);
  const sectionEnd = headings[targetIndex + 1]?.index ?? changelog.length;
  return changelog.slice(headings[targetIndex].index, sectionEnd);
}
