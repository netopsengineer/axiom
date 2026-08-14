import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateCodexMarketplace } from "./check-codex-marketplace.mjs";
import {
  CODEX_MARKETPLACE_PATH,
  loadMarketplaceContract,
  renderMarketplaceOutputs,
  writeOutputTransaction,
} from "./lib/marketplace-contract.mjs";

const PLUGIN_NAMES = ["sample-one", "sample-two"];

test("static validator accepts coexistence and native-only fixtures", async (t) => {
  const coexistenceRoot = await createStaticFixture(t);
  assert.deepEqual(await validateCodexMarketplace(coexistenceRoot), {
    nativeOnly: false,
    pluginNames: PLUGIN_NAMES,
  });

  const nativeOnlyRoot = await createStaticFixture(t);
  await rm(path.join(nativeOnlyRoot, ".claude-plugin/marketplace.json"));
  assert.deepEqual(await validateCodexMarketplace(nativeOnlyRoot), {
    nativeOnly: true,
    pluginNames: PLUGIN_NAMES,
  });
});

for (const [label, mutate, expected] of [
  [
    "path traversal",
    async (root) => {
      await mutateJson(path.join(root, CODEX_MARKETPLACE_PATH), (catalog) => {
        catalog.plugins[0].source.path = "./../sample-one";
      });
    },
    /escapes its intended root/u,
  ],
  [
    "absolute path",
    async (root) => {
      await mutateJson(path.join(root, CODEX_MARKETPLACE_PATH), (catalog) => {
        catalog.plugins[0].source.path = "/tmp/sample-one";
      });
    },
    /normalized \.\/-prefixed path/u,
  ],
  [
    "missing native manifest",
    async (root) => {
      await rm(path.join(root, "plugins/sample-one/.codex-plugin/plugin.json"));
    },
    /native manifest.*is missing|plugin\.json is missing/u,
  ],
  [
    "missing skills",
    async (root) => {
      await rm(path.join(root, "plugins/sample-one/skills"), {
        recursive: true,
      });
    },
    /skills.*target is missing/u,
  ],
  [
    "malformed skill frontmatter",
    async (root) => {
      await writeFile(
        path.join(root, "plugins/sample-one/skills/sample-one-skill/SKILL.md"),
        "---\nname: [\ndescription: Invalid YAML.\n---\n",
      );
    },
    /frontmatter is invalid YAML/u,
  ],
  [
    "missing skill name",
    async (root) => {
      await writeFile(
        path.join(root, "plugins/sample-one/skills/sample-one-skill/SKILL.md"),
        "---\ndescription: Missing name.\n---\n",
      );
    },
    /name must be "sample-one-skill"/u,
  ],
  [
    "missing skill description",
    async (root) => {
      await writeFile(
        path.join(root, "plugins/sample-one/skills/sample-one-skill/SKILL.md"),
        "---\nname: sample-one-skill\n---\n",
      );
    },
    /description must be non-blank/u,
  ],
  [
    "version drift",
    async (root) => {
      await mutateJson(
        path.join(root, "plugins/sample-one/.codex-plugin/plugin.json"),
        (manifest) => {
          manifest.version = "9.9.9";
        },
      );
    },
    /version differs from canonical metadata/u,
  ],
  [
    "policy drift",
    async (root) => {
      await mutateJson(path.join(root, CODEX_MARKETPLACE_PATH), (catalog) => {
        catalog.plugins[0].policy.installation = "INSTALLED_BY_DEFAULT";
      });
    },
    /policy drift/u,
  ],
  [
    "plugin order drift",
    async (root) => {
      await mutateJson(path.join(root, CODEX_MARKETPLACE_PATH), (catalog) => {
        catalog.plugins.reverse();
      });
    },
    /plugin order and set/u,
  ],
  [
    "skipped plugin entry",
    async (root) => {
      await mutateJson(path.join(root, CODEX_MARKETPLACE_PATH), (catalog) => {
        catalog.plugins.pop();
      });
    },
    /plugin order and set/u,
  ],
]) {
  test(`static validator rejects ${label}`, async (t) => {
    const root = await createStaticFixture(t);
    await mutate(root);
    await assert.rejects(validateCodexMarketplace(root), expected);
  });
}

test("static validator rejects an escaping skills symlink", async (t) => {
  const root = await createStaticFixture(t);
  const outsideRoot = await mkdtemp(
    path.join(os.tmpdir(), "axiom-static-outside-"),
  );
  t.after(() => rm(outsideRoot, { force: true, recursive: true }));
  await writeText(
    path.join(outsideRoot, "sample-one-skill/SKILL.md"),
    "---\nname: sample-one-skill\ndescription: Outside.\n---\n",
  );
  await rm(path.join(root, "plugins/sample-one/skills"), { recursive: true });
  await symlink(outsideRoot, path.join(root, "plugins/sample-one/skills"));

  await assert.rejects(
    validateCodexMarketplace(root),
    /canonical target must resolve inside/u,
  );
});

test("static validator rejects a stale native manifest", async (t) => {
  const root = await createStaticFixture(t);
  await writeText(
    path.join(root, "plugins/removed-plugin/.codex-plugin/plugin.json"),
    "{}\n",
  );

  await assert.rejects(
    validateCodexMarketplace(root),
    /Stale native manifest plugins\/removed-plugin\/\.codex-plugin\/plugin\.json/u,
  );
});

async function createStaticFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "axiom-static-fixture-"));
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
        description: "A static-validator fixture.",
      },
    },
    plugins: PLUGIN_NAMES,
  });

  for (const pluginName of PLUGIN_NAMES) {
    await writeJson(
      path.join(root, `plugins/${pluginName}/.axiom/plugin.json`),
      createPlugin(pluginName),
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

function createPlugin(pluginName) {
  return {
    schemaVersion: 1,
    name: pluginName,
    version: "1.2.3",
    displayName: pluginName === "sample-one" ? "Sample One" : "Sample Two",
    description: `The ${pluginName} fixture plugin.`,
    author: {
      name: "axiom-plugins",
      email: "enterprise.code.developer@gmail.com",
    },
    license: "MIT",
    repository: "https://github.com/netopsengineer/axiom",
    keywords: [pluginName, "testing"],
    components: {
      skills: "./skills/",
    },
    platforms: {
      claude: {
        catalogDescription: `The ${pluginName} catalog entry.`,
        category: "testing",
      },
      codex: {
        category: "Productivity",
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        shortDescription: `Run ${pluginName} safely.`,
        defaultPrompt: [`Run ${pluginName}.`],
      },
    },
  };
}

async function mutateJson(filePath, mutate) {
  const value = JSON.parse(await readFile(filePath, "utf8"));
  mutate(value);
  await writeJson(filePath, value);
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value);
}
