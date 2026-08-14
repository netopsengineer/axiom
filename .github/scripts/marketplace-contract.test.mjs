import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  CLAUDE_MARKETPLACE_PATH,
  CODEX_MARKETPLACE_PATH,
  compareGeneratedOutputs,
  loadMarketplaceContract,
  renderMarketplaceOutputs,
  validateCanonicalMarketplace,
  validateCanonicalPlugin,
  writeOutputTransaction,
} from "./lib/marketplace-contract.mjs";

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
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
      description: "A test marketplace.",
    },
  },
  plugins: [PLUGIN_NAME],
};

const PLUGIN = {
  schemaVersion: 1,
  name: PLUGIN_NAME,
  version: "1.2.3",
  displayName: "Sample Plugin",
  description: "A sample plugin for contract tests.",
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

test("current repository renders byte-identical Claude artifacts", async () => {
  const contract = await loadMarketplaceContract(REPOSITORY_ROOT);
  const outputs = renderMarketplaceOutputs(contract);

  for (const [relativePath, expected] of outputs) {
    if (
      relativePath !== CLAUDE_MARKETPLACE_PATH &&
      !relativePath.includes("/.claude-plugin/")
    ) {
      continue;
    }
    const actual = await readFile(
      path.join(REPOSITORY_ROOT, relativePath),
      "utf8",
    );
    assert.equal(expected, actual, relativePath);
  }
});

test("valid canonical fixture renders stable ordered Codex JSON", async (t) => {
  const root = await createFixture(t);
  const contract = await loadMarketplaceContract(root);
  const outputs = renderMarketplaceOutputs(contract);
  const marketplaceText = outputs.get(CODEX_MARKETPLACE_PATH);
  const manifestText = outputs.get(
    `plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`,
  );

  assert.ok(marketplaceText.endsWith("\n"));
  assert.ok(!marketplaceText.endsWith("\n\n"));
  assert.ok(manifestText.endsWith("\n"));
  assert.ok(!manifestText.endsWith("\n\n"));
  assertOrdered(marketplaceText, [
    '"name"',
    '"interface"',
    '"plugins"',
    '"source"',
    '"policy"',
    '"category"',
  ]);
  assertOrdered(manifestText, [
    '"name"',
    '"version"',
    '"description"',
    '"author"',
    '"repository"',
    '"license"',
    '"keywords"',
    '"skills"',
    '"interface"',
    '"displayName"',
    '"shortDescription"',
    '"longDescription"',
    '"developerName"',
    '"category"',
    '"websiteURL"',
    '"defaultPrompt"',
  ]);
  assert.deepEqual(JSON.parse(marketplaceText), {
    name: "axiom",
    interface: { displayName: "Axiom" },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: { source: "local", path: `./plugins/${PLUGIN_NAME}` },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  });
  assert.deepEqual(JSON.parse(manifestText), {
    name: PLUGIN_NAME,
    version: "1.2.3",
    description: "A sample plugin for contract tests.",
    author: {
      name: "axiom-plugins",
      email: "enterprise.code.developer@gmail.com",
    },
    repository: "https://github.com/netopsengineer/axiom",
    license: "MIT",
    keywords: ["sample", "testing"],
    skills: "./skills/",
    interface: {
      displayName: "Sample Plugin",
      shortDescription: "Run the sample plugin safely.",
      longDescription: "A sample plugin for contract tests.",
      developerName: "axiom-plugins",
      category: "Productivity",
      websiteURL: "https://github.com/netopsengineer/axiom",
      defaultPrompt: ["Run the sample workflow."],
    },
  });
});

test("valid canonical fixture renders stable ordered Claude JSON", async (t) => {
  const root = await createFixture(t);
  const contract = await loadMarketplaceContract(root);
  const outputs = renderMarketplaceOutputs(contract);
  const marketplaceText = outputs.get(CLAUDE_MARKETPLACE_PATH);
  const manifestText = outputs.get(
    `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`,
  );

  assert.ok(marketplaceText.endsWith("\n"));
  assert.ok(!marketplaceText.endsWith("\n\n"));
  assert.ok(manifestText.endsWith("\n"));
  assert.ok(!manifestText.endsWith("\n\n"));
  assertOrdered(marketplaceText, [
    '"$schema"',
    '"name"',
    '"description"',
    '"owner"',
    '"plugins"',
  ]);
  assertOrdered(manifestText, [
    '"$schema"',
    '"name"',
    '"displayName"',
    '"description"',
    '"version"',
    '"author"',
    '"license"',
    '"repository"',
    '"keywords"',
  ]);
});

test("canonical root required-field families fail closed", () => {
  const cases = [
    ["schemaVersion", (value) => delete value.schemaVersion],
    ["name", (value) => delete value.name],
    ["displayName", (value) => delete value.displayName],
    ["owner", (value) => delete value.owner],
    ["owner.email", (value) => delete value.owner.email],
    ["platforms", (value) => delete value.platforms],
    [
      "platforms.claude.description",
      (value) => delete value.platforms.claude.description,
    ],
    ["plugins", (value) => delete value.plugins],
  ];

  for (const [label, mutate] of cases) {
    const value = structuredClone(MARKETPLACE);
    mutate(value);
    assert.throws(
      () => validateCanonicalMarketplace(value),
      /missing required field|must be/u,
      label,
    );
  }
});

test("canonical plugin required-field families fail closed", () => {
  const cases = [
    ["schemaVersion", (value) => delete value.schemaVersion],
    ["name", (value) => delete value.name],
    ["version", (value) => delete value.version],
    ["displayName", (value) => delete value.displayName],
    ["description", (value) => delete value.description],
    ["author", (value) => delete value.author],
    ["author.email", (value) => delete value.author.email],
    ["license", (value) => delete value.license],
    ["repository", (value) => delete value.repository],
    ["keywords", (value) => delete value.keywords],
    ["components", (value) => delete value.components],
    ["components.skills", (value) => delete value.components.skills],
    ["platforms", (value) => delete value.platforms],
    ["platforms.claude", (value) => delete value.platforms.claude],
    [
      "platforms.claude.category",
      (value) => delete value.platforms.claude.category,
    ],
    ["platforms.codex", (value) => delete value.platforms.codex],
    [
      "platforms.codex.shortDescription",
      (value) => delete value.platforms.codex.shortDescription,
    ],
    [
      "platforms.codex.defaultPrompt",
      (value) => delete value.platforms.codex.defaultPrompt,
    ],
    ["platforms.codex.policy", (value) => delete value.platforms.codex.policy],
    [
      "platforms.codex.policy.authentication",
      (value) => delete value.platforms.codex.policy.authentication,
    ],
  ];

  for (const [label, mutate] of cases) {
    const value = structuredClone(PLUGIN);
    mutate(value);
    assert.throws(
      () => validateCanonicalPlugin(value, PLUGIN_NAME),
      /missing required field|must be/u,
      label,
    );
  }
});

test("unknown fields fail at every canonical object level", () => {
  const rootCases = [
    (value) => (value.extra = true),
    (value) => (value.owner.extra = true),
    (value) => (value.platforms.extra = true),
    (value) => (value.platforms.claude.extra = true),
  ];
  for (const mutate of rootCases) {
    const value = structuredClone(MARKETPLACE);
    mutate(value);
    assert.throws(() => validateCanonicalMarketplace(value), /unknown field/u);
  }

  const pluginCases = [
    (value) => (value.extra = true),
    (value) => (value.author.extra = true),
    (value) => (value.components.extra = true),
    (value) => (value.platforms.extra = true),
    (value) => (value.platforms.claude.extra = true),
    (value) => (value.platforms.codex.extra = true),
    (value) => (value.platforms.codex.policy.extra = true),
  ];
  for (const mutate of pluginCases) {
    const value = structuredClone(PLUGIN);
    mutate(value);
    assert.throws(
      () => validateCanonicalPlugin(value, PLUGIN_NAME),
      /unknown field/u,
    );
  }
});

test("duplicate canonical plugin names fail", () => {
  const value = structuredClone(MARKETPLACE);
  value.plugins.push(PLUGIN_NAME);
  assert.throws(
    () => validateCanonicalMarketplace(value),
    /duplicate value "sample-plugin"/u,
  );
});

test("plugin name must match its directory", () => {
  const value = structuredClone(PLUGIN);
  value.name = "different-plugin";
  assert.throws(
    () => validateCanonicalPlugin(value, PLUGIN_NAME),
    /must match plugin directory/u,
  );
});

test("malformed Semantic Version fails", () => {
  for (const invalidVersion of ["1", "1.2", "01.2.3", "1.2.3-"]) {
    const value = structuredClone(PLUGIN);
    value.version = invalidVersion;
    assert.throws(
      () => validateCanonicalPlugin(value, PLUGIN_NAME),
      /valid Semantic Version/u,
    );
  }
});

test("component path traversal and absolute paths fail", () => {
  for (const invalidPath of ["../skills", "./../skills", "/tmp/skills"]) {
    const value = structuredClone(PLUGIN);
    value.components.skills = invalidPath;
    assert.throws(
      () => validateCanonicalPlugin(value, PLUGIN_NAME),
      /must start with|must stay inside|must be "\.\/skills\/"/u,
    );
  }
});

test("escaping skill symlink fails canonical filesystem validation", async (t) => {
  const root = await createFixture(t);
  const outside = await mkdtemp(
    path.join(os.tmpdir(), "axiom-contract-outside-"),
  );
  t.after(() => rm(outside, { force: true, recursive: true }));
  await rm(path.join(root, "plugins", PLUGIN_NAME, "skills"), {
    recursive: true,
  });
  await symlink(outside, path.join(root, "plugins", PLUGIN_NAME, "skills"));

  await assert.rejects(
    loadMarketplaceContract(root),
    /canonical skills path must resolve inside/u,
  );
});

test("unregistered generated manifest gives an exact removal instruction", async (t) => {
  const root = await createFixture(t);
  await writeText(
    path.join(root, "plugins/unregistered/.claude-plugin/plugin.json"),
    "{}\n",
  );

  await assert.rejects(
    loadMarketplaceContract(root),
    /Register it in \.axiom\/marketplace\.json, or remove the obsolete artifact and plugin directory manually/u,
  );
});

test("check comparison reports every stale path without writing", async (t) => {
  const root = await createFixture(t);
  const contract = await loadMarketplaceContract(root);
  const outputs = renderMarketplaceOutputs(contract);
  await writeText(path.join(root, CLAUDE_MARKETPLACE_PATH), "{}\n");
  const manifestPath = `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`;
  await writeText(path.join(root, manifestPath), '{"stale":true}\n');

  const before = await snapshotTree(root);
  const stalePaths = await compareGeneratedOutputs(root, outputs);
  const after = await snapshotTree(root);

  assert.deepEqual(
    stalePaths,
    [
      CLAUDE_MARKETPLACE_PATH,
      CODEX_MARKETPLACE_PATH,
      manifestPath,
      `plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`,
    ].sort(),
  );
  assert.deepEqual(after, before);
});

for (const [label, relativePath] of [
  ["Claude catalog", CLAUDE_MARKETPLACE_PATH],
  ["Codex catalog", CODEX_MARKETPLACE_PATH],
  ["Claude manifest", `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`],
  ["Codex manifest", `plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`],
]) {
  test(`check comparison rejects a direct ${label} edit`, async (t) => {
    const root = await createFixture(t);
    const contract = await loadMarketplaceContract(root);
    const outputs = renderMarketplaceOutputs(contract);
    await writeOutputTransaction(root, outputs);
    await writeText(path.join(root, relativePath), '{"direct":"edit"}\n');

    assert.deepEqual(await compareGeneratedOutputs(root, outputs), [
      relativePath,
    ]);
  });
}

test("canonical description change without generation reports both stale manifests", async (t) => {
  const root = await createFixture(t);
  const initialContract = await loadMarketplaceContract(root);
  await writeOutputTransaction(root, renderMarketplaceOutputs(initialContract));
  const canonicalPath = path.join(
    root,
    `plugins/${PLUGIN_NAME}/.axiom/plugin.json`,
  );
  const plugin = JSON.parse(await readFile(canonicalPath, "utf8"));
  plugin.description = "A changed canonical description.";
  await writeJson(canonicalPath, plugin);

  const nextContract = await loadMarketplaceContract(root);
  const stalePaths = await compareGeneratedOutputs(
    root,
    renderMarketplaceOutputs(nextContract),
  );
  assert.deepEqual(stalePaths, [
    `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`,
    `plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`,
  ]);
});

test("registered plugin with a missing directory fails closed", async (t) => {
  const root = await createFixture(t);
  await rm(path.join(root, "plugins", PLUGIN_NAME), { recursive: true });
  await assert.rejects(
    loadMarketplaceContract(root),
    /registers missing plugin plugins\/sample-plugin/u,
  );
});

test("registered plugin with a missing canonical record fails closed", async (t) => {
  const root = await createFixture(t);
  await rm(path.join(root, `plugins/${PLUGIN_NAME}/.axiom/plugin.json`));
  await assert.rejects(
    loadMarketplaceContract(root),
    /plugins\/sample-plugin\/\.axiom\/plugin\.json must exist and be readable/u,
  );
});

test("transaction writes changed outputs once and is idempotent", async (t) => {
  const root = await createFixture(t);
  const contract = await loadMarketplaceContract(root);
  const outputs = renderMarketplaceOutputs(contract);

  const firstChanged = await writeOutputTransaction(root, outputs);
  const secondChanged = await writeOutputTransaction(root, outputs);

  assert.deepEqual(firstChanged, [...outputs.keys()].sort());
  assert.deepEqual(secondChanged, []);
  assert.deepEqual(await compareGeneratedOutputs(root, outputs), []);
});

test("mid-commit failure rolls every output back byte-for-byte", async (t) => {
  const root = await createFixture(t);
  const contract = await loadMarketplaceContract(root);
  const outputs = renderMarketplaceOutputs(contract);

  for (const relativePath of outputs.keys()) {
    await writeText(path.join(root, relativePath), `old:${relativePath}\n`);
  }
  const before = await snapshotTree(root);

  await assert.rejects(
    writeOutputTransaction(root, outputs, { commitFailureAt: 1 }),
    /Rollback restored every replaced output/u,
  );

  assert.deepEqual(await snapshotTree(root), before);
});

test("build check succeeds and does not change current repository bytes", async () => {
  const contract = await loadMarketplaceContract(REPOSITORY_ROOT);
  const before = await snapshotPaths(REPOSITORY_ROOT, [
    ...renderMarketplaceOutputs(contract).keys(),
  ]);
  const { stdout } = await execFileAsync(
    process.execPath,
    [".github/scripts/build-marketplaces.mjs", "--check"],
    { cwd: REPOSITORY_ROOT },
  );
  const after = await snapshotPaths(REPOSITORY_ROOT, [...before.keys()]);

  assert.match(stdout, /artifacts are current/u);
  assert.deepEqual(after, before);
});

async function createFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "axiom-contract-"));
  t.after(() => rm(root, { force: true, recursive: true }));

  await writeJson(path.join(root, ".axiom/marketplace.json"), MARKETPLACE);
  await writeJson(
    path.join(root, `plugins/${PLUGIN_NAME}/.axiom/plugin.json`),
    PLUGIN,
  );
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/skills/sample-skill/SKILL.md`),
    "---\nname: sample-skill\ndescription: Exercise the fixture.\n---\n",
  );
  return root;
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value);
}

function assertOrdered(text, tokens) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = text.indexOf(token, previousIndex + 1);
    assert.ok(index > previousIndex, `${token} must appear in adapter order`);
    previousIndex = index;
  }
}

async function snapshotTree(root) {
  const entries = [];
  await walk(root, "", entries);
  return entries;
}

async function walk(root, relativePath, entries) {
  const absolutePath = path.join(root, relativePath);
  const children = await readdir(absolutePath, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name));
  for (const child of children) {
    const childRelativePath = path.posix.join(relativePath, child.name);
    const childAbsolutePath = path.join(root, childRelativePath);
    const childStats = await lstat(childAbsolutePath);
    if (childStats.isDirectory()) {
      entries.push([childRelativePath, "directory"]);
      await walk(root, childRelativePath, entries);
    } else if (childStats.isSymbolicLink()) {
      entries.push([childRelativePath, "symlink"]);
    } else {
      const content = await readFile(childAbsolutePath);
      entries.push([
        childRelativePath,
        createHash("sha256").update(content).digest("hex"),
      ]);
    }
  }
}

async function snapshotPaths(root, relativePaths) {
  const result = new Map();
  for (const relativePath of relativePaths) {
    const content = await readFile(path.join(root, relativePath));
    result.set(
      relativePath,
      createHash("sha256").update(content).digest("hex"),
    );
  }
  return result;
}
