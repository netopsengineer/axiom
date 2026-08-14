import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  loadMarketplaceContract,
  renderMarketplaceOutputs,
  writeOutputTransaction,
} from "./lib/marketplace-contract.mjs";
import {
  assertReleaseScope,
  preparePluginRelease,
} from "./prepare-plugin-release.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PLUGIN_NAMES = ["release-one", "release-two"];

for (const [label, nextVersion] of [
  ["patch", "1.2.4"],
  ["minor", "1.3.0"],
  ["major", "2.0.0"],
  ["prerelease-compatible", "2.0.0-beta.1"],
]) {
  test(`release preparation writes a ${label} version to exactly three files`, async (t) => {
    const root = await createReleaseFixture(t);
    const before = await snapshotTree(root);
    const result = await preparePluginRelease({
      repositoryRoot: root,
      pluginRoot: path.join(root, "plugins/release-one"),
      nextVersion,
    });
    const after = await snapshotTree(root);

    assert.equal(result.previousVersion, "1.2.3");
    assert.equal(result.version, nextVersion);
    assert.deepEqual(result.changedPaths, [
      "plugins/release-one/.axiom/plugin.json",
      "plugins/release-one/.claude-plugin/plugin.json",
      "plugins/release-one/.codex-plugin/plugin.json",
    ]);
    assert.deepEqual(changedPaths(before, after), result.changedPaths);
    await assertPluginVersions(root, "release-one", nextVersion);
    await assertPluginVersions(root, "release-two", "4.5.6");
  });
}

test("invalid release version fails before writing", async (t) => {
  const root = await createReleaseFixture(t);
  const before = await snapshotTree(root);

  await assert.rejects(
    preparePluginRelease({
      repositoryRoot: root,
      pluginRoot: path.join(root, "plugins/release-one"),
      nextVersion: "not-a-version",
    }),
    /valid Semantic Version/u,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("release target outside plugins fails before writing", async (t) => {
  const root = await createReleaseFixture(t);
  const outside = await mkdtemp(
    path.join(os.tmpdir(), "axiom-release-outside-"),
  );
  t.after(() => rm(outside, { force: true, recursive: true }));
  const before = await snapshotTree(root);

  await assert.rejects(
    preparePluginRelease({
      repositoryRoot: root,
      pluginRoot: outside,
      nextVersion: "1.2.4",
    }),
    /release target must resolve inside/u,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("unregistered release target fails before writing", async (t) => {
  const root = await createReleaseFixture(t);
  const unregisteredRoot = path.join(root, "plugins/unregistered");
  await mkdir(unregisteredRoot, { recursive: true });
  const before = await snapshotTree(root);

  await assert.rejects(
    preparePluginRelease({
      repositoryRoot: root,
      pluginRoot: unregisteredRoot,
      nextVersion: "1.2.4",
    }),
    /not registered|Unregistered plugin directory/u,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("failed compiler validation leaves the fixture unchanged", async (t) => {
  const root = await createReleaseFixture(t);
  const canonicalPath = path.join(
    root,
    "plugins/release-two/.axiom/plugin.json",
  );
  await mutateJson(canonicalPath, (plugin) => {
    plugin.components.skills = "./missing/";
  });
  const before = await snapshotTree(root);

  await assert.rejects(
    preparePluginRelease({
      repositoryRoot: root,
      pluginRoot: path.join(root, "plugins/release-one"),
      nextVersion: "1.2.4",
    }),
    /must be "\.\/skills\/"|must exist and be readable/u,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("injected transaction failure rolls all release files back", async (t) => {
  const root = await createReleaseFixture(t);
  const before = await snapshotTree(root);

  await assert.rejects(
    preparePluginRelease({
      repositoryRoot: root,
      pluginRoot: path.join(root, "plugins/release-one"),
      nextVersion: "1.2.4",
      commitFailureAt: 1,
    }),
    /Rollback restored every replaced output/u,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("release scope rejects a root catalog mutation", async (t) => {
  const root = await createReleaseFixture(t);
  const { contract, currentOutputs, nextOutputs } =
    await createReleaseScopeFixture(root);
  nextOutputs.set(".claude-plugin/marketplace.json", '{"mutated":true}\n');

  assert.throws(
    () =>
      assertReleaseScope({
        contract,
        currentOutputs,
        nextOutputs,
        selectedPluginName: "release-one",
      }),
    /must not change root catalog \.claude-plugin\/marketplace\.json/u,
  );
});

test("release scope rejects another plugin manifest mutation", async (t) => {
  const root = await createReleaseFixture(t);
  const { contract, currentOutputs, nextOutputs } =
    await createReleaseScopeFixture(root);
  nextOutputs.set(
    "plugins/release-two/.codex-plugin/plugin.json",
    '{"mutated":true}\n',
  );

  assert.throws(
    () =>
      assertReleaseScope({
        contract,
        currentOutputs,
        nextOutputs,
        selectedPluginName: "release-one",
      }),
    /scope assertion failed for plugins\/release-two\/\.codex-plugin\/plugin\.json/u,
  );
});

test("release configs call platform-neutral preparation and list exact assets", async () => {
  const requiredAssets = [
    ".axiom/plugin.json",
    ".claude-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    "CHANGELOG.md",
  ];
  for (const pluginName of ["axiom-git", "axiom-versioning"]) {
    const configPath = path.join(
      REPOSITORY_ROOT,
      `plugins/${pluginName}/release.config.js`,
    );
    const config = (await import(pathToFileURL(configPath))).default;
    const execEntry = config.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === "@semantic-release/exec",
    );
    const gitEntry = config.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === "@semantic-release/git",
    );
    assert.match(
      execEntry[1].prepareCmd,
      /^node \.\.\/\.\.\/\.github\/scripts\/prepare-plugin-release\.mjs \. \$\{nextRelease\.version\}$/u,
    );
    assert.deepEqual(gitEntry[1].assets, requiredAssets);
  }
});

async function createReleaseFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "axiom-release-fixture-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  await writeJson(path.join(root, ".axiom/marketplace.json"), {
    schemaVersion: 1,
    name: "axiom",
    displayName: "Axiom",
    owner: {
      name: "axiom-plugins",
      email: "enterprise.code.developer@gmail.com",
    },
    platforms: {
      claude: {
        description: "A release fixture marketplace.",
      },
    },
    plugins: PLUGIN_NAMES,
  });
  for (const [index, pluginName] of PLUGIN_NAMES.entries()) {
    await writeJson(
      path.join(root, `plugins/${pluginName}/.axiom/plugin.json`),
      createPlugin(pluginName, index === 0 ? "1.2.3" : "4.5.6"),
    );
    await writeText(
      path.join(
        root,
        `plugins/${pluginName}/skills/${pluginName}-skill/SKILL.md`,
      ),
      `---\nname: ${pluginName}-skill\ndescription: Exercise ${pluginName}.\n---\n`,
    );
  }
  const contract = await loadMarketplaceContract(root);
  await writeOutputTransaction(root, renderMarketplaceOutputs(contract));
  return root;
}

async function createReleaseScopeFixture(root) {
  const contract = await loadMarketplaceContract(root);
  const currentOutputs = renderMarketplaceOutputs(contract);
  const nextContract = {
    ...contract,
    plugins: contract.plugins.map((plugin) =>
      plugin.name === "release-one"
        ? {
            ...plugin,
            metadata: { ...plugin.metadata, version: "1.2.4" },
          }
        : plugin,
    ),
  };
  return {
    contract,
    currentOutputs,
    nextOutputs: renderMarketplaceOutputs(nextContract),
  };
}

function createPlugin(pluginName, version) {
  return {
    schemaVersion: 1,
    name: pluginName,
    version,
    displayName: pluginName === "release-one" ? "Release One" : "Release Two",
    description: `The ${pluginName} fixture plugin.`,
    author: {
      name: "axiom-plugins",
      email: "enterprise.code.developer@gmail.com",
    },
    license: "MIT",
    repository: "https://github.com/netopsengineer/axiom",
    keywords: [pluginName, "release"],
    components: {
      skills: "./skills/",
    },
    platforms: {
      claude: {
        catalogDescription: `The ${pluginName} release fixture.`,
        category: "testing",
      },
      codex: {
        category: "Productivity",
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        shortDescription: `Prepare ${pluginName} releases.`,
        defaultPrompt: [`Prepare ${pluginName}.`],
      },
    },
  };
}

async function assertPluginVersions(root, pluginName, expectedVersion) {
  for (const relativePath of [
    `plugins/${pluginName}/.axiom/plugin.json`,
    `plugins/${pluginName}/.claude-plugin/plugin.json`,
    `plugins/${pluginName}/.codex-plugin/plugin.json`,
  ]) {
    const record = JSON.parse(
      await readFile(path.join(root, relativePath), "utf8"),
    );
    assert.equal(record.version, expectedVersion, relativePath);
  }
}

function changedPaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter(
      (relativePath) => before.get(relativePath) !== after.get(relativePath),
    )
    .sort();
}

async function snapshotTree(root) {
  const result = new Map();
  await walk(root, "", result);
  return result;
}

async function walk(root, relativePath, result) {
  const entries = await readdir(path.join(root, relativePath), {
    withFileTypes: true,
  });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const entryRelativePath = path.posix.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      await walk(root, entryRelativePath, result);
      continue;
    }
    const content = await readFile(path.join(root, entryRelativePath));
    result.set(
      entryRelativePath,
      createHash("sha256").update(content).digest("hex"),
    );
  }
}

async function mutateJson(filePath, mutate) {
  const record = JSON.parse(await readFile(filePath, "utf8"));
  mutate(record);
  await writeJson(filePath, record);
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value);
}
