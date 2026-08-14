import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  loadMarketplaceContract,
  renderMarketplaceOutputs,
  writeOutputTransaction,
} from "./lib/marketplace-contract.mjs";
import {
  assertExactPluginSequence,
  assertStateSnapshotUnchanged,
  cleanupOwnedTemporaryDirectory,
  collectMarketplaceFixtureFiles,
  createMarketplaceFixture,
  snapshotClaudeRealState,
  snapshotCodexRealState,
  validateFixtureRelativePath,
} from "./lib/marketplace-smoke-fixture.mjs";

const execFileAsync = promisify(execFile);
const PLUGIN_NAME = "sample-plugin";
const MARKETPLACE = {
  schemaVersion: 1,
  name: "axiom",
  displayName: "Axiom",
  owner: {
    name: "axiom-plugins",
    email: "enterprise.code.developer@gmail.com",
  },
  platforms: {
    claude: {
      description: "A fixture marketplace.",
    },
  },
  plugins: [PLUGIN_NAME],
};
const PLUGIN = {
  schemaVersion: 1,
  name: PLUGIN_NAME,
  version: "1.2.3",
  displayName: "Sample Plugin",
  description: "A sample plugin for fixture tests.",
  author: {
    name: "axiom-plugins",
    email: "enterprise.code.developer@gmail.com",
  },
  license: "MIT",
  repository: "https://github.com/netopsengineer/axiom",
  keywords: ["sample", "testing"],
  components: {
    skills: "./skills/",
  },
  platforms: {
    claude: {
      catalogDescription: "A sample marketplace entry.",
      category: "testing",
    },
    codex: {
      category: "Productivity",
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL",
      },
      shortDescription: "Run the sample plugin safely.",
      defaultPrompt: ["Run the sample workflow."],
    },
  },
};

test("fixture selection includes tracked and generated files but ignores scratch", async (t) => {
  const root = await createGitFixture(t);
  const selection = await collectMarketplaceFixtureFiles(root);

  assert.ok(selection.files.includes(".axiom/marketplace.json"));
  assert.ok(selection.files.includes(".agents/plugins/marketplace.json"));
  assert.ok(
    selection.files.includes(
      `plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`,
    ),
  );
  assert.ok(
    selection.files.includes(
      `plugins/${PLUGIN_NAME}/skills/sample-skill/run.sh`,
    ),
  );
  assert.ok(!selection.files.some((file) => file.endsWith(".DS_Store")));
  assert.ok(!selection.files.some((file) => file.endsWith("scratch.local.md")));
});

test("fixture selection rejects a missing required generated file", async (t) => {
  const root = await createGitFixture(t);
  await rm(path.join(root, ".agents/plugins/marketplace.json"));

  await assert.rejects(
    collectMarketplaceFixtureFiles(root),
    /missing required file \.agents\/plugins\/marketplace\.json/u,
  );
});

test("fixture selection rejects an unexpected plugin directory", async (t) => {
  const root = await createGitFixture(t);
  await writeText(
    path.join(root, "plugins/unregistered/README.md"),
    "Unexpected.\n",
  );

  await assert.rejects(
    collectMarketplaceFixtureFiles(root),
    /Plugin directory plugins\/unregistered is not registered/u,
  );
});

test("fixture paths reject absolute and traversal inputs", () => {
  for (const invalidPath of [
    "/tmp/marketplace.json",
    "../marketplace.json",
    "plugins/../outside.json",
  ]) {
    assert.throws(
      () => validateFixtureRelativePath(invalidPath),
      /Unsafe fixture path|escapes its root/u,
      invalidPath,
    );
  }
});

test("fixture selection rejects a symlink that escapes its source plugin", async (t) => {
  const root = await createGitFixture(t);
  const outsideRoot = await mkdtemp(
    path.join(os.tmpdir(), "axiom-fixture-outside-"),
  );
  t.after(() => rm(outsideRoot, { force: true, recursive: true }));
  await writeText(
    path.join(outsideRoot, "secret.txt"),
    "not package content\n",
  );
  const linkPath = path.join(root, `plugins/${PLUGIN_NAME}/escape.txt`);
  await symlink(path.join(outsideRoot, "secret.txt"), linkPath);
  await runGit(root, ["add", `plugins/${PLUGIN_NAME}/escape.txt`]);

  await assert.rejects(
    collectMarketplaceFixtureFiles(root),
    /must resolve inside/u,
  );
});

test("coexistence and native-only fixtures are deterministic", async (t) => {
  const root = await createGitFixture(t);
  const selection = await collectMarketplaceFixtureFiles(root);
  const coexistenceOne = await createMarketplaceFixture(selection);
  const coexistenceTwo = await createMarketplaceFixture(selection);
  const nativeOnly = await createMarketplaceFixture(selection, {
    kind: "native-only",
  });
  t.after(async () => {
    await cleanupOwnedTemporaryDirectory(coexistenceOne.root);
    await cleanupOwnedTemporaryDirectory(coexistenceTwo.root);
    await cleanupOwnedTemporaryDirectory(nativeOnly.root);
  });

  assert.deepEqual(
    await snapshotTree(coexistenceOne.root),
    await snapshotTree(coexistenceTwo.root),
  );
  assert.ok(
    (await snapshotTree(coexistenceOne.root)).some(
      ([relativePath]) => relativePath === ".claude-plugin/marketplace.json",
    ),
  );
  assert.ok(
    !(await snapshotTree(nativeOnly.root)).some(
      ([relativePath]) => relativePath === ".claude-plugin/marketplace.json",
    ),
  );
  assert.deepEqual(
    nativeOnly.files,
    coexistenceOne.files.filter(
      (file) => file !== ".claude-plugin/marketplace.json",
    ),
  );
});

test("Codex snapshots exclude credentials and detect mutable state changes", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "axiom-state-snapshot-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const configRoot = path.join(root, "codex");
  const homeDirectory = path.join(root, "home");
  await writeText(path.join(configRoot, "config.toml"), 'model = "test"\n');
  await writeText(path.join(configRoot, "auth.json"), '{"token":"first"}\n');
  await writeText(path.join(configRoot, "plugins/cache.txt"), "cache\n");
  await writeText(
    path.join(homeDirectory, ".agents/plugins/marketplace.json"),
    "{}\n",
  );

  const before = await snapshotCodexRealState({ configRoot, homeDirectory });
  await writeText(path.join(configRoot, "auth.json"), '{"token":"second"}\n');
  const afterCredentialChange = await snapshotCodexRealState({
    configRoot,
    homeDirectory,
  });
  assert.doesNotThrow(() =>
    assertStateSnapshotUnchanged(before, afterCredentialChange, "Codex"),
  );

  await writeText(path.join(configRoot, "config.toml"), 'model = "changed"\n');
  const afterConfigChange = await snapshotCodexRealState({
    configRoot,
    homeDirectory,
  });
  assert.throws(
    () => assertStateSnapshotUnchanged(before, afterConfigChange, "Codex"),
    /real state changed/u,
  );
});

test("Claude snapshots exclude credentials and detect mutable state changes", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "axiom-claude-snapshot-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  await writeText(path.join(root, "settings.json"), '{"theme":"dark"}\n');
  await writeText(path.join(root, ".credentials.json"), '{"token":"first"}\n');
  await writeText(path.join(root, "plugins/cache.txt"), "cache\n");

  const before = await snapshotClaudeRealState({ configRoot: root });
  await writeText(path.join(root, ".credentials.json"), '{"token":"second"}\n');
  const afterCredentialChange = await snapshotClaudeRealState({
    configRoot: root,
  });
  assert.doesNotThrow(() =>
    assertStateSnapshotUnchanged(before, afterCredentialChange, "Claude"),
  );

  await writeText(path.join(root, "settings.json"), '{"theme":"light"}\n');
  const afterSettingsChange = await snapshotClaudeRealState({
    configRoot: root,
  });
  assert.throws(
    () => assertStateSnapshotUnchanged(before, afterSettingsChange, "Claude"),
    /real state changed/u,
  );
});

test("cleanup refuses an unowned temporary path", async (t) => {
  const unownedPath = await mkdtemp(path.join(os.tmpdir(), "axiom-unowned-"));
  t.after(() => rm(unownedPath, { force: true, recursive: true }));

  await assert.rejects(
    cleanupOwnedTemporaryDirectory(unownedPath),
    /Refusing cleanup of unowned path/u,
  );
});

test("host plugin guards reject partial Claude installation and Codex discovery", () => {
  const expected = ["sample-one", "sample-two"];
  assert.throws(
    () =>
      assertExactPluginSequence(
        ["sample-one"],
        expected,
        "Claude installed plugin set",
      ),
    /Claude installed plugin set must exactly equal/u,
  );
  assert.throws(
    () =>
      assertExactPluginSequence(
        ["sample-one"],
        expected,
        "Codex discovered plugin set",
      ),
    /Codex discovered plugin set must exactly equal/u,
  );
});

async function createGitFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "axiom-fixture-source-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  await runGit(root, ["init", "--quiet"]);
  await writeText(
    path.join(root, ".gitignore"),
    "**/.DS_Store\n*.local.md\n.agents/*\n!.agents/plugins/\n.agents/plugins/*\n!.agents/plugins/marketplace.json\n",
  );
  await writeJson(path.join(root, ".axiom/marketplace.json"), MARKETPLACE);
  await writeJson(
    path.join(root, `plugins/${PLUGIN_NAME}/.axiom/plugin.json`),
    PLUGIN,
  );
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/skills/sample-skill/SKILL.md`),
    "---\nname: sample-skill\ndescription: Exercise the fixture.\n---\n",
  );
  const executablePath = path.join(
    root,
    `plugins/${PLUGIN_NAME}/skills/sample-skill/run.sh`,
  );
  await writeText(executablePath, "#!/bin/sh\nexit 0\n");
  await chmod(executablePath, 0o755);
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/.DS_Store`),
    "ignored\n",
  );
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/scratch.local.md`),
    "ignored\n",
  );
  await runGit(root, [
    "add",
    ".gitignore",
    ".axiom",
    `plugins/${PLUGIN_NAME}/.axiom`,
    `plugins/${PLUGIN_NAME}/skills`,
  ]);

  const contract = await loadMarketplaceContract(root);
  await writeOutputTransaction(root, renderMarketplaceOutputs(contract));
  return root;
}

async function runGit(root, argumentsList) {
  await execFileAsync("git", argumentsList, {
    cwd: root,
    timeout: 30_000,
  });
}

async function snapshotTree(root) {
  const entries = [];
  await walk(root, "", entries);
  return entries;
}

async function walk(root, relativePath, entries) {
  const children = await readdir(path.join(root, relativePath), {
    withFileTypes: true,
  });
  children.sort((left, right) => left.name.localeCompare(right.name));
  for (const child of children) {
    const childRelativePath = path.posix.join(relativePath, child.name);
    if (childRelativePath === ".git" || childRelativePath.startsWith(".git/")) {
      continue;
    }
    const absolutePath = path.join(root, childRelativePath);
    if (child.isDirectory()) {
      entries.push([childRelativePath, "directory"]);
      await walk(root, childRelativePath, entries);
      continue;
    }
    const content = await readFile(absolutePath);
    const mode = (await stat(absolutePath)).mode & 0o777;
    entries.push([
      childRelativePath,
      createHash("sha256").update(content).digest("hex"),
      mode,
    ]);
  }
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value);
}
