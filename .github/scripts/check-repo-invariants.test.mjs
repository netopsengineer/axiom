import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkRepositoryInvariants } from "./check-repo-invariants.mjs";
import {
  CODEX_MARKETPLACE_PATH,
  loadMarketplaceContract,
  renderMarketplaceOutputs,
  writeOutputTransaction,
} from "./lib/marketplace-contract.mjs";

const PLUGIN_NAME = "future-plugin";
const SKILL_NAME = "future-skill";

test("one canonical registration renders and validates both marketplaces", async (t) => {
  const root = await createRepositoryFixture(t);
  const contract = await loadMarketplaceContract(root);
  const outputs = renderMarketplaceOutputs(contract);

  assert.ok(outputs.has(CODEX_MARKETPLACE_PATH));
  assert.ok(outputs.has(".claude-plugin/marketplace.json"));
  assert.ok(outputs.has(`plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`));
  assert.ok(outputs.has(`plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`));
  assert.deepEqual(await checkRepositoryInvariants(root), []);
});

for (const [label, mutate, expected] of [
  [
    "missing skill file",
    async (root) => {
      await rm(
        path.join(root, `plugins/${PLUGIN_NAME}/skills/${SKILL_NAME}/SKILL.md`),
      );
    },
    new RegExp(
      `plugins/${PLUGIN_NAME}/skills/${SKILL_NAME}/SKILL\\.md must exist`,
      "u",
    ),
  ],
  [
    "missing eval manifest",
    async (root) => {
      await rm(
        path.join(
          root,
          `plugins/${PLUGIN_NAME}/skills/${SKILL_NAME}/evals/evals.json`,
        ),
      );
    },
    new RegExp(
      `plugins/${PLUGIN_NAME}/skills/${SKILL_NAME}/evals/evals\\.json must exist`,
      "u",
    ),
  ],
  [
    "missing README eval history",
    async (root) => {
      await writeText(
        path.join(root, `plugins/${PLUGIN_NAME}/README.md`),
        "# Future Plugin\n",
      );
    },
    new RegExp(
      `plugins/${PLUGIN_NAME}/README\\.md must include ## Eval history`,
      "u",
    ),
  ],
  [
    "missing Claude manifest",
    async (root) => {
      await rm(
        path.join(root, `plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json`),
      );
    },
    new RegExp(
      `plugins/${PLUGIN_NAME}/\\.claude-plugin/plugin\\.json must exist`,
      "u",
    ),
  ],
  [
    "missing Codex manifest",
    async (root) => {
      await rm(
        path.join(root, `plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`),
      );
    },
    new RegExp(
      `plugins/${PLUGIN_NAME}/\\.codex-plugin/plugin\\.json must exist`,
      "u",
    ),
  ],
  [
    "missing release file",
    async (root) => {
      await rm(path.join(root, `plugins/${PLUGIN_NAME}/release.config.js`));
    },
    new RegExp(`plugins/${PLUGIN_NAME}/release\\.config\\.js must exist`, "u"),
  ],
]) {
  test(`repository invariants reject ${label} with the exact path`, async (t) => {
    const root = await createRepositoryFixture(t);
    await mutate(root);
    const errors = await checkRepositoryInvariants(root);
    assert.ok(
      errors.some((error) => expected.test(error)),
      errors.join("\n"),
    );
  });
}

test("repository invariants reject generated vendor drift", async (t) => {
  const root = await createRepositoryFixture(t);
  const manifestPath = `plugins/${PLUGIN_NAME}/.codex-plugin/plugin.json`;
  await mutateJson(path.join(root, manifestPath), (manifest) => {
    manifest.version = "9.9.9";
  });

  const errors = await checkRepositoryInvariants(root);
  assert.ok(
    errors.some((error) =>
      error.includes(`${manifestPath}.version must equal`),
    ),
    errors.join("\n"),
  );
  assert.ok(
    errors.some((error) =>
      error.includes(`${manifestPath} is generated and out of date`),
    ),
    errors.join("\n"),
  );
});

test("repository invariants reject unexpected native marketplace files", async (t) => {
  const root = await createRepositoryFixture(t);
  await writeText(path.join(root, ".agents/plugins/unexpected.json"), "{}\n");

  const errors = await checkRepositoryInvariants(root);
  assert.ok(
    errors.some((error) => error.includes(".agents/plugins may contain only")),
    errors.join("\n"),
  );
});

test("repository invariants reject shipped runtime dependencies", async (t) => {
  const root = await createRepositoryFixture(t);
  const packagePath = path.join(root, `plugins/${PLUGIN_NAME}/package.json`);
  await mutateJson(packagePath, (packageRecord) => {
    packageRecord.dependencies = { yaml: "^2.9.0" };
  });

  const errors = await checkRepositoryInvariants(root);
  assert.ok(
    errors.some((error) =>
      error.includes(
        "shipped plugins cannot depend on root npm runtime packages",
      ),
    ),
    errors.join("\n"),
  );
});

test("repository invariants reject workflows without explicit permissions", async (t) => {
  const root = await createRepositoryFixture(t);
  await writeText(
    path.join(root, ".github/workflows/validate.yml"),
    "name: Fixture\non: push\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    steps: []\n",
  );

  const errors = await checkRepositoryInvariants(root);
  assert.ok(
    errors.some((error) => error.includes("missing on: validate")),
    errors.join("\n"),
  );
});

async function createRepositoryFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "axiom-repo-invariants-"));
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
        description: "A fixture marketplace.",
      },
    },
    plugins: [PLUGIN_NAME],
  });
  await writeJson(
    path.join(root, `plugins/${PLUGIN_NAME}/.axiom/plugin.json`),
    createPlugin(),
  );
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/README.md`),
    "# Future Plugin\n\n## Eval history\n\nFixture evidence.\n",
  );
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/CHANGELOG.md`),
    "# Changelog\n",
  );
  await writeJson(path.join(root, `plugins/${PLUGIN_NAME}/package.json`), {
    name: PLUGIN_NAME,
    private: true,
    version: "0.0.0",
    type: "module",
  });
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/release.config.js`),
    "export default {};\n",
  );
  await writeText(
    path.join(root, `plugins/${PLUGIN_NAME}/skills/${SKILL_NAME}/SKILL.md`),
    `---\nname: ${SKILL_NAME}\ndescription: Exercise the future plugin.\n---\n`,
  );
  await writeJson(
    path.join(
      root,
      `plugins/${PLUGIN_NAME}/skills/${SKILL_NAME}/evals/evals.json`,
    ),
    {
      skill_name: SKILL_NAME,
      evals: [
        {
          id: 1,
          prompt: "Exercise the fixture.",
          expected_output: "The fixture is exercised.",
          expectations: ["The output is present."],
        },
      ],
    },
  );
  await writeText(
    path.join(root, ".github/workflows/validate.yml"),
    "name: Fixture\non: push\npermissions: {}\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    steps: []\n",
  );

  const contract = await loadMarketplaceContract(root);
  await writeOutputTransaction(root, renderMarketplaceOutputs(contract));
  return root;
}

function createPlugin() {
  return {
    schemaVersion: 1,
    name: PLUGIN_NAME,
    version: "1.2.3",
    displayName: "Future Plugin",
    description: "A future plugin for repository invariant tests.",
    author: {
      name: "axiom-plugins",
      email: "enterprise.code.developer@gmail.com",
    },
    license: "MIT",
    repository: "https://github.com/netopsengineer/axiom",
    keywords: ["future", "testing"],
    components: {
      skills: "./skills/",
    },
    platforms: {
      claude: {
        catalogDescription: "A future fixture plugin.",
        category: "testing",
      },
      codex: {
        category: "Productivity",
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        shortDescription: "Exercise a future fixture plugin.",
        defaultPrompt: ["Exercise the future fixture."],
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
