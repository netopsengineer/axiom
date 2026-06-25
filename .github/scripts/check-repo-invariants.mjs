import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const ROOT = process.cwd();
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];

async function main() {
  const marketplacePath = ".claude-plugin/marketplace.json";
  const marketplace = await readJson(marketplacePath);

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    fail(`${marketplacePath} must contain a non-empty plugins array.`);
  }

  const pluginDirs = await listDirectories("plugins");
  const marketplaceNames = new Set();

  for (const plugin of marketplace.plugins ?? []) {
    checkMarketplacePlugin(plugin, marketplaceNames);
  }

  for (const pluginName of pluginDirs) {
    if (!marketplaceNames.has(pluginName)) {
      fail(`plugins/${pluginName} is not registered in ${marketplacePath}.`);
    }
  }

  for (const plugin of marketplace.plugins ?? []) {
    if (typeof plugin?.name === "string") {
      await checkPlugin(plugin.name);
    }
  }

  await checkWorkflowPermissions();

  if (errors.length > 0) {
    console.error("Repository invariant check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Repository invariants passed.");
}

function checkMarketplacePlugin(plugin, seenNames) {
  if (!plugin || typeof plugin !== "object" || Array.isArray(plugin)) {
    fail(".claude-plugin/marketplace.json plugins entries must be objects.");
    return;
  }

  const { name, source, description, category } = plugin;
  if (typeof name !== "string" || !KEBAB_CASE.test(name)) {
    fail(`Marketplace plugin name must be lowercase kebab-case: ${name}`);
    return;
  }

  if (seenNames.has(name)) {
    fail(`Duplicate marketplace plugin name: ${name}`);
  }
  seenNames.add(name);

  const expectedSource = `./plugins/${name}`;
  if (source !== expectedSource) {
    fail(`Marketplace plugin ${name} must use source: "${expectedSource}".`);
  }

  if (typeof description !== "string" || description.trim() === "") {
    fail(`Marketplace plugin ${name} must have a non-empty description.`);
  }

  if (typeof category !== "string" || category.trim() === "") {
    fail(`Marketplace plugin ${name} must have a non-empty category.`);
  }
}

async function checkPlugin(pluginName) {
  const pluginPath = path.join("plugins", pluginName);

  if (!KEBAB_CASE.test(pluginName)) {
    fail(`Plugin directory must be lowercase kebab-case: ${pluginPath}`);
  }

  await expectFile(path.join(pluginPath, ".claude-plugin/plugin.json"));
  await expectFile(path.join(pluginPath, "README.md"));
  await expectFile(path.join(pluginPath, "CHANGELOG.md"));
  await expectFile(path.join(pluginPath, "package.json"));
  await expectFile(path.join(pluginPath, "release.config.js"));

  const manifestPath = path.join(pluginPath, ".claude-plugin/plugin.json");
  const manifest = await readJson(manifestPath);
  if (manifest.name !== pluginName) {
    fail(`${manifestPath} name must be "${pluginName}".`);
  }

  checkReadmeEvalHistory(
    pluginName,
    await readText(path.join(pluginPath, "README.md")),
  );
  await checkSkills(pluginName);
}

async function checkSkills(pluginName) {
  const skillsPath = path.join("plugins", pluginName, "skills");
  const entries = await readdir(path.join(ROOT, skillsPath), {
    withFileTypes: true,
  }).catch((error) => {
    fail(`${skillsPath} must exist and be readable: ${error.message}`);
    return [];
  });

  const skillDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.name.startsWith(".")) {
      fail(`${skillsPath} may only contain directory-format skills.`);
    }
  }

  if (skillDirs.length === 0) {
    fail(`${skillsPath} must contain at least one skill directory.`);
  }

  for (const skillName of skillDirs) {
    if (!KEBAB_CASE.test(skillName)) {
      fail(`${skillsPath}/${skillName} must be lowercase kebab-case.`);
    }

    const skillPath = path.join(skillsPath, skillName);
    await expectFile(path.join(skillPath, "SKILL.md"));

    const evalPath = path.join(skillPath, "evals/evals.json");
    await expectFile(evalPath);
    const evalManifest = await readJson(evalPath);
    if (evalManifest.skill_name !== skillName) {
      fail(`${evalPath} skill_name must be "${skillName}".`);
    }
    if (!Array.isArray(evalManifest.evals) || evalManifest.evals.length === 0) {
      fail(`${evalPath} must contain a non-empty evals array.`);
    }
  }
}

function checkReadmeEvalHistory(pluginName, readme) {
  const heading = /^## Eval history\s*$/m;
  const match = heading.exec(readme);
  if (!match) {
    fail(`plugins/${pluginName}/README.md must include ## Eval history.`);
    return;
  }

  const afterHeading = readme.slice(match.index + match[0].length);
  const nextHeadingIndex = afterHeading.search(/^## /m);
  const section =
    nextHeadingIndex === -1
      ? afterHeading
      : afterHeading.slice(0, nextHeadingIndex);

  const meaningfulLines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("<!--"));

  if (meaningfulLines.length === 0) {
    fail(`plugins/${pluginName}/README.md ## Eval history must be non-empty.`);
  }
}

// Safety invariant for the read-only Actions default token permission: every
// workflow must declare its own permissions (top-level OR on every job) so no
// workflow silently inherits the repository default. Presence is checked, never
// the value — write-needing workflows keep their explicit write scopes. Scope is
// .github/workflows/ only; composite actions are not workflows.
async function checkWorkflowPermissions() {
  const workflowsDir = ".github/workflows";
  let entries;
  try {
    entries = await readdir(path.join(ROOT, workflowsDir), {
      withFileTypes: true,
    });
  } catch (error) {
    fail(`${workflowsDir} must exist and be readable: ${error.message}`);
    return;
  }

  const workflowFiles = entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  for (const fileName of workflowFiles) {
    const relativePath = path.join(workflowsDir, fileName);
    const text = await readText(relativePath);

    let root;
    try {
      const doc = YAML.parseDocument(text);
      if (doc.errors.length > 0) {
        fail(`${relativePath} is not valid YAML: ${doc.errors[0].message}`);
        continue;
      }
      root = doc.toJS();
    } catch (error) {
      fail(`${relativePath} is not valid YAML: ${error.message}`);
      continue;
    }

    if (!root || typeof root !== "object" || Array.isArray(root)) {
      fail(`${relativePath} must be a YAML mapping declaring permissions.`);
      continue;
    }

    if (Object.hasOwn(root, "permissions")) {
      continue; // top-level permissions present — safe
    }

    const jobs = root.jobs;
    const jobsIsPlainObject =
      jobs !== null && typeof jobs === "object" && !Array.isArray(jobs);
    const jobNames = jobsIsPlainObject ? Object.keys(jobs) : [];

    // Guard the [].every() === true trap: an empty/non-object jobs map with no
    // top-level permissions must fail, not vacuously pass.
    if (!jobsIsPlainObject || jobNames.length === 0) {
      fail(
        `${relativePath} must declare a top-level permissions block (no jobs found to carry job-level permissions).`,
      );
      continue;
    }

    const jobsMissingPermissions = jobNames.filter((jobName) => {
      const job = jobs[jobName];
      return (
        !job ||
        typeof job !== "object" ||
        Array.isArray(job) ||
        !Object.hasOwn(job, "permissions")
      );
    });

    if (jobsMissingPermissions.length > 0) {
      fail(
        `${relativePath} must declare top-level permissions or set permissions on every job; missing on: ${jobsMissingPermissions.join(", ")}.`,
      );
    }
  }
}

async function listDirectories(relativePath) {
  const entries = await readdir(path.join(ROOT, relativePath), {
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

async function readJson(relativePath) {
  const text = await readText(relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return {};
  }
}

async function readText(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8").catch((error) => {
    fail(`Could not read ${relativePath}: ${error.message}`);
    return "";
  });
}

async function expectFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  try {
    await access(absolutePath);
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      fail(`${relativePath} must be a file.`);
    }
  } catch (error) {
    fail(`${relativePath} must exist: ${error.message}`);
  }
}

function fail(message) {
  errors.push(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
