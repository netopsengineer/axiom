import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

test("existing Plugin manifests job gates both marketplace hosts", async () => {
  const workflow = await readYaml(".github/workflows/validate.yml");
  const job = workflow.jobs.plugins;
  assert.equal(job.name, "Plugin manifests");
  assert.deepEqual(workflow.permissions, { contents: "read" });
  const localValidatorIndex = job.steps.findIndex(
    (step) => step.uses === "$/.github/actions/validate-plugins",
  );
  assert.ok(localValidatorIndex >= 0);
  const commands = job.steps
    .map((step) => step.run)
    .filter((command) => typeof command === "string");
  assertSubsequence(commands, [
    "npm ci --loglevel=error",
    "npm run marketplaces:check",
    "npm run check:claude:smoke",
    "npm run check:codex:static",
    "npm run check:codex:smoke",
    "npm run test:validate-plugins",
  ]);
  const npmInstallIndex = job.steps.findIndex(
    (step) => step.run === "npm ci --loglevel=error",
  );
  assert.ok(npmInstallIndex >= 0 && npmInstallIndex < localValidatorIndex);
  assertPinnedNodeSetup(job);
});

// Exercise the contract against dependency updates and unsafe workflow mutations.
test("Node setup accepts updated immutable pins and rejects unsafe changes", async () => {
  const workflow = await readYaml(".github/workflows/validate.yml");
  const original = workflow.jobs.plugins;
  const setupIndex = original.steps.findIndex((step) =>
    step.uses?.startsWith("actions/setup-node@"),
  );
  for (const sha of [
    "820762786026740c76f36085b0efc47a31fe5020",
    "949feb2413d6458794dcd2491c4babbbce0c15c1",
  ]) {
    const job = structuredClone(original);
    job.steps[setupIndex].uses = `actions/setup-node@${sha}`;
    assert.doesNotThrow(() => assertPinnedNodeSetup(job));
  }
  for (const reference of [
    "actions/setup-node@v7",
    "actions/setup-node@main",
    "actions/setup-node@949feb2",
    `actions/setup-node@${"g".repeat(40)}`,
    `other/setup-node@${"a".repeat(40)}`,
    `actions/setup-node/extra@${"a".repeat(40)}`,
  ]) {
    const job = structuredClone(original);
    job.steps[setupIndex].uses = reference;
    assert.throws(() => assertPinnedNodeSetup(job), assert.AssertionError);
  }
  const mutations = [
    (job) => job.steps.splice(setupIndex, 1),
    (job) => job.steps.push(structuredClone(job.steps[setupIndex])),
    (job) => {
      job.steps[setupIndex].with["node-version"] = 22;
    },
    (job) => {
      delete job.steps[setupIndex].with["node-version"];
    },
    (job) => {
      delete job.steps[setupIndex].with.cache;
    },
    (job) => {
      job.steps[setupIndex].with.cache = "yarn";
    },
    (job) => {
      job.steps[setupIndex].if = "false";
    },
    (job) => {
      job.steps[setupIndex]["continue-on-error"] = true;
    },
    (job) => {
      job.steps.push(...job.steps.splice(setupIndex, 1));
    },
    (job) => {
      job.steps = job.steps.filter(
        (step) => step.run !== "npm ci --loglevel=error",
      );
    },
  ];
  for (const mutate of mutations) {
    const job = structuredClone(original);
    mutate(job);
    assert.throws(() => assertPinnedNodeSetup(job), assert.AssertionError);
  }
});

function assertPinnedNodeSetup(job) {
  const setupSteps = job.steps.filter((step) =>
    step.uses?.startsWith("actions/setup-node@"),
  );
  assert.equal(
    setupSteps.length,
    1,
    "exactly one official Node setup is required",
  );
  const setup = setupSteps[0];
  assert.match(setup.uses, /^actions\/setup-node@[a-f0-9]{40}$/u);
  assert.equal(String(setup.with?.["node-version"]), "24");
  assert.equal(setup.with?.cache, "npm");
  assert.equal(setup.if, undefined, "Node setup must run unconditionally");
  assert.ok(
    setup["continue-on-error"] === undefined ||
      setup["continue-on-error"] === false,
    "Node setup must fail closed",
  );
  const npmInstallIndex = job.steps.findIndex(
    (step) => step.run === "npm ci --loglevel=error",
  );
  assert.ok(
    job.steps.indexOf(setup) < npmInstallIndex,
    "Node setup must precede npm ci",
  );
}

test("actionlint exception only covers the self-repository syntax diagnostic", async () => {
  const config = await readYaml(".github/actionlint.yaml");
  assert.deepEqual(Object.keys(config), ["paths"]);
  assert.deepEqual(Object.keys(config.paths), [
    ".github/workflows/validate.yml",
  ]);
  const exceptions = config.paths[".github/workflows/validate.yml"].ignore;
  assert.equal(exceptions.length, 1);
  const exception = new RegExp(exceptions[0], "u");
  const diagnostic =
    'specifying action "$/.github/actions/validate-plugins" in invalid format because ref is missing. available formats are "{owner}/{repo}@{ref}" or "{owner}/{repo}/{path}@{ref}"';
  assert.match(diagnostic, exception);
  for (const invalidDiagnostic of [
    diagnostic.replace("validate-plugins", "other-action"),
    diagnostic.replace("$/.github", "./.github"),
    diagnostic.replace("ref is missing", "owner is missing"),
    `${diagnostic} unexpected text`,
  ]) {
    assert.doesNotMatch(invalidDiagnostic, exception);
  }

  const hooks = await readYaml(".pre-commit-config.yaml");
  assert.ok(
    hooks.repos.some(({ hooks }) => hooks.some(({ id }) => id === "zizmor")),
  );
  const workflow = await readYaml(".github/workflows/validate.yml");
  assert.ok(
    workflow.jobs.workflows.steps.some(
      ({ run }) => run === "npm run check:precommit:security",
    ),
  );
});

test("existing JavaScript job gates generation, lint, and unit tests", async () => {
  const workflow = await readYaml(".github/workflows/validate.yml");
  const commands = workflow.jobs.javascript.steps
    .map((step) => step.run)
    .filter((command) => typeof command === "string");
  assertSubsequence(commands, [
    "npm ci --loglevel=error",
    "npm run generate:check",
    "npm run lint",
    "npm run test:automation",
    "npm run test:marketplaces",
  ]);
});

test("repository checks gate every npm audit severity", async () => {
  const workflow = await readYaml(".github/workflows/validate.yml");
  const commands = workflow.jobs.repository.steps
    .map((step) => step.run)
    .filter((command) => typeof command === "string");
  assertSubsequence(commands, ["npm ci --loglevel=error", "npm run audit:ci"]);
});

test("local hooks preserve the required dual-marketplace order and triggers", async () => {
  const configuration = await readYaml(".pre-commit-config.yaml");
  const localHooks = configuration.repos.find(
    ({ repo }) => repo === "local",
  ).hooks;
  const hookIds = localHooks.map(({ id }) => id);
  assertSubsequence(hookIds, [
    "marketplace-generate",
    "claude-plugin-validate",
    "claude-marketplace-smoke",
    "codex-marketplace-static",
    "codex-marketplace-smoke",
    "repo-invariants",
    "marketplace-script-tests",
    "automation-script-tests",
    "readme-generated-blocks",
    "yaml-syntax",
    "spelling",
    "markdown-links",
  ]);
  const codexSmoke = localHooks.find(
    ({ id }) => id === "codex-marketplace-smoke",
  );
  for (const requiredPattern of [
    "\\.agents/plugins/marketplace\\.json",
    "\\.codex-plugin/plugin\\.json",
    "skills/",
    "package\\.json",
    "package-lock\\.json",
  ]) {
    assert.ok(
      codexSmoke.files.includes(requiredPattern),
      `${requiredPattern} must be in the Codex smoke trigger`,
    );
  }

  const triggerCases = new Map([
    ["marketplace-generate", ".axiom/marketplace.json"],
    [
      "claude-plugin-validate",
      "plugins/axiom-git/skills/commit-message/SKILL.md",
    ],
    [
      "claude-marketplace-smoke",
      "plugins/axiom-git/skills/commit-message/SKILL.md",
    ],
    [
      "codex-marketplace-static",
      "plugins/axiom-git/skills/commit-message/SKILL.md",
    ],
    [
      "codex-marketplace-smoke",
      "plugins/axiom-git/skills/commit-message/SKILL.md",
    ],
    ["repo-invariants", "plugins/axiom-git/skills/commit-message/SKILL.md"],
    ["readme-generated-blocks", ".axiom/marketplace.json"],
  ]);
  for (const [hookId, changedPath] of triggerCases) {
    const hook = localHooks.find(({ id }) => id === hookId);
    assert.ok(hook, `${hookId} must exist`);
    assert.match(changedPath, new RegExp(hook.files, "u"), `${hookId} trigger`);
  }
});

test("Dependabot owns exact Claude and Codex CLI updates in repository tooling", async () => {
  const dependabot = await readYaml(".github/dependabot.yml");
  const npmUpdate = dependabot.updates.find(
    (update) => update["package-ecosystem"] === "npm",
  );
  assert.ok(npmUpdate.groups["repository-tooling"]);
  assert.equal(npmUpdate.groups["release-tooling"], undefined);
  assert.equal(npmUpdate.schedule.interval, "daily");
  assert.equal(npmUpdate["versioning-strategy"], "increase");

  const packageRecord = await readJson("package.json");
  assert.match(
    packageRecord.devDependencies["@anthropic-ai/claude-code"],
    /^\d+\.\d+\.\d+$/u,
  );
  assert.match(
    packageRecord.devDependencies["@openai/codex"],
    /^\d+\.\d+\.\d+$/u,
  );
  assert.deepEqual(packageRecord.allowScripts, {
    "@anthropic-ai/claude-code": true,
  });
  const codexSmoke = await readText(
    ".github/scripts/smoke-codex-marketplace.mjs",
  );
  assert.match(codexSmoke, /node_modules\/@openai\/codex/u);
  assert.match(codexSmoke, /"bin\/codex\.js"/u);
  assert.match(codexSmoke, /assertCodexPackageContract/u);
  const claudeSmoke = await readText(
    ".github/scripts/smoke-claude-marketplace.mjs",
  );
  assert.match(claudeSmoke, /CLAUDE_BIN/u);
  assert.match(claudeSmoke, /assertClaudePackageContract/u);
});

test("audit, audit-fix, validator-bump, and App auto-merge loops remain enabled", async () => {
  for (const workflowPath of [
    ".github/workflows/dependency-audit.yml",
    ".github/workflows/dependency-audit-fix.yml",
    ".github/workflows/bump-validate-action.yml",
    ".github/workflows/release-note-compatibility.yml",
  ]) {
    const workflow = await readYaml(workflowPath);
    assert.ok(Array.isArray(workflow.on.schedule), workflowPath);
    assert.ok(workflow.on.workflow_dispatch !== undefined, workflowPath);
  }
  const autoMerge = await readYaml(
    ".github/workflows/dependabot-auto-merge.yml",
  );
  assert.ok(Array.isArray(autoMerge.on.schedule));
  assert.ok(autoMerge.on.workflow_dispatch !== undefined);
  assert.deepEqual(autoMerge.permissions, {
    contents: "read",
  });
  const workflowText = await readText(
    ".github/workflows/dependabot-auto-merge.yml",
  );
  assert.match(workflowText, /steps\.app-token\.outputs\.token/u);
  assert.match(workflowText, /dependabot\[bot\]/u);
  assert.match(workflowText, /head_repo.*GITHUB_REPOSITORY/u);
});

test("the local validator wrapper uses the repository Claude dependency", async () => {
  const action = await readText(".github/actions/validate-plugins/action.yml");
  assert.match(action, /node_modules\/\.bin/u);
  assert.doesNotMatch(action, /GITHUB_PATH/u);
  assert.doesNotMatch(action, /@anthropic-ai\/claude-code@\$\{/u);
  assert.doesNotMatch(action, /default: latest/u);
});

test("release-note compatibility is issue-backed and promotes only green candidates", async () => {
  const workflow = await readYaml(
    ".github/workflows/release-note-compatibility.yml",
  );
  assert.ok(Array.isArray(workflow.on.schedule));
  assert.ok(workflow.on.workflow_dispatch !== undefined);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.jobs.probe.permissions, {
    actions: "write",
    contents: "read",
  });
  const workflowText = await readText(
    ".github/workflows/release-note-compatibility.yml",
  );
  for (const expected of [
    "check:release-notes:compatibility",
    "gh issue create",
    "gh issue reopen",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: this is a literal workflow placeholder.
    "conventional-changelog-conventionalcommits@${CANDIDATE_PRESET}",
    "gh pr merge --auto --squash",
  ]) {
    assert.match(workflowText, new RegExp(escapeRegExp(expected), "u"));
  }
});

test("release follows canonical plugin order and verifies the mutated repository", async () => {
  const workflowText = await readText(".github/workflows/release.yml");
  assert.match(workflowText, /list-release-plugins\.mjs/u);
  assert.doesNotMatch(workflowText, /plugins\/\*\//u);
  assert.match(workflowText, /npm run check:repo/u);
  assert.match(workflowText, /npm run test:automation/u);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function assertSubsequence(actual, expected) {
  let previousIndex = -1;
  for (const value of expected) {
    const index = actual.indexOf(value, previousIndex + 1);
    assert.ok(
      index > previousIndex,
      `${value} must appear after ${actual[previousIndex] ?? "the start"}`,
    );
    previousIndex = index;
  }
}

async function readYaml(relativePath) {
  return YAML.parse(await readText(relativePath));
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function readText(relativePath) {
  return readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8");
}
