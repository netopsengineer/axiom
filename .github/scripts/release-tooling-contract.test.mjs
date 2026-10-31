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
import {
  assertReleaseNoteFixtures,
  RELEASE_NOTE_OPTIONS,
} from "./lib/release-note-contract.mjs";
import { determineProbeStatus } from "./probe-release-note-compatibility.mjs";

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
  assert.match(
    packageRecord.devDependencies["conventional-changelog-conventionalcommits"],
    /^\d+\.\d+\.\d+$/u,
  );

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
    assert.deepEqual(releaseNotesEntry[1], RELEASE_NOTE_OPTIONS);
    await assertReleaseNoteFixtures({
      cwd: path.join(ROOT, "plugins", plugin),
      generateNotes,
      pluginName: plugin,
    });
  }
});

test("the release-note probe distinguishes managed, held, ready, and unsafe upgrades", () => {
  const base = {
    currentPresetVersion: "9.3.1",
    candidatePresetVersion: "10.3.0",
    vulnerabilities: 0,
  };
  assert.equal(
    determineProbeStatus({
      ...base,
      candidatePresetVersion: "9.4.0",
      compatible: true,
    }),
    "managed",
  );
  assert.equal(determineProbeStatus({ ...base, compatible: false }), "held");
  assert.equal(determineProbeStatus({ ...base, compatible: true }), "ready");
  assert.equal(
    determineProbeStatus({
      ...base,
      compatible: true,
      vulnerabilities: 1,
    }),
    "security-blocked",
  );
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

test("monorepo temp directories use the scoped native adapter", async () => {
  const { createRequire } = await import("node:module");
  const { readdir } = await import("node:fs/promises");
  const manifest = await readJson("package.json");
  assert.equal(manifest.devDependencies["semantic-release-monorepo"], "8.0.2");
  assert.equal(
    manifest.devDependencies.tempy,
    "file:.github/release-tooling/tempy-directory",
  );
  assert.equal(manifest.overrides["semantic-release-monorepo"].tempy, "$tempy");
  const require = createRequire(import.meta.url);
  const monorepoEntry = require.resolve("semantic-release-monorepo");
  const monorepoRequire = createRequire(monorepoEntry);
  assert.equal(monorepoRequire.resolve("tempy"), require.resolve("tempy"));
  const adapterManifest = await readJson(
    ".github/release-tooling/tempy-directory/package.json",
  );
  assert.deepEqual(adapterManifest.dependencies ?? {}, {});
  assert.equal(adapterManifest.private, true);

  // Fail closed on an upstream API expansion instead of silently substituting
  // a partial tempy implementation for a new consumer or cleanup operation.
  const sourceRoot = path.dirname(monorepoEntry);
  let directoryCalls = 0;
  for (const entry of await readdir(sourceRoot)) {
    if (!entry.endsWith(".js")) continue;
    const source = await readFile(path.join(sourceRoot, entry), "utf8");
    if (!source.includes("tempy")) continue;
    assert.equal(entry, "git-utils.js");
    assert.match(source, /import tempy from 'tempy';/u);
    directoryCalls += [...source.matchAll(/tempy\.directory\(\)/gu)].length;
    const withoutSupportedUsage = source
      .replace("import tempy from 'tempy';", "")
      .replaceAll("tempy.directory()", "");
    assert.doesNotMatch(withoutSupportedUsage, /tempy/u);
  }
  assert.equal(directoryCalls, 3);
});

test("native temp directories are unique, private and caller-cleaned", async () => {
  const { lstat, rm, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { default: tempy } = await import("tempy");
  assert.deepEqual(Object.keys(tempy), ["directory"]);
  assert.ok(Object.isFrozen(tempy));
  assert.throws(() => tempy.directory({ prefix: "../escape" }), TypeError);
  assert.throws(() => tempy.directory(undefined), TypeError);
  const directories = [];
  try {
    for (let index = 0; index < 16; index += 1) {
      directories.push(tempy.directory());
    }
    assert.equal(new Set(directories).size, directories.length);
    for (const directory of directories) {
      assert.equal(path.dirname(directory), path.resolve(tmpdir()));
      const stat = await lstat(directory);
      assert.ok(stat.isDirectory());
      assert.equal(stat.isSymbolicLink(), false);
      if (process.platform !== "win32") assert.equal(stat.mode & 0o077, 0);
    }
    const filename = path.join(directories[0], "literal-[*].txt");
    await writeFile(filename, "caller-owned data");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(await readFile(filename, "utf8"), "caller-owned data");
  } finally {
    await Promise.all(
      directories.map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
  }
});

test("monorepo git initialization works with the native directory adapter", async () => {
  const { execFile } = await import("node:child_process");
  const { rm } = await import("node:fs/promises");
  const { promisify } = await import("node:util");
  const { initGit } = await import(
    "semantic-release-monorepo/src/git-utils.js"
  );
  const exec = promisify(execFile);
  for (const bare of [false, true]) {
    const { cwd, repositoryUrl } = await initGit(bare);
    try {
      const { stdout } = await exec(
        "git",
        ["rev-parse", "--is-bare-repository"],
        { cwd },
      );
      assert.equal(stdout.trim(), String(bare));
      assert.equal(repositoryUrl, pathToFileURL(cwd).href);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
});
