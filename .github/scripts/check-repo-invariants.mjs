#!/usr/bin/env node
import { lstat, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import YAML from "yaml";
import {
  CANONICAL_MARKETPLACE_PATH,
  CLAUDE_MARKETPLACE_PATH,
  CODEX_MARKETPLACE_PATH,
  compareGeneratedOutputs,
  loadMarketplaceContract,
  renderMarketplaceOutputs,
} from "./lib/marketplace-contract.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const COMMON_METADATA_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "license",
  "repository",
  "keywords",
];
const RUNTIME_DEPENDENCY_FIELDS = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "bundledDependencies",
  "bundleDependencies",
];

export async function checkRepositoryInvariants(repositoryRoot) {
  const context = {
    root: path.resolve(repositoryRoot),
    errors: [],
  };
  const canonical = await readJson(context, CANONICAL_MARKETPLACE_PATH);
  const claudeCatalog = await readJson(context, CLAUDE_MARKETPLACE_PATH);
  const codexCatalog = await readJson(context, CODEX_MARKETPLACE_PATH);
  const canonicalNames = canonicalPluginNames(context, canonical);
  const pluginDirectories = await listDirectories(context, "plugins");

  checkExactOrder(
    context,
    canonicalNames,
    claudePluginNames(context, claudeCatalog),
    CLAUDE_MARKETPLACE_PATH,
  );
  checkExactOrder(
    context,
    canonicalNames,
    codexPluginNames(context, codexCatalog),
    CODEX_MARKETPLACE_PATH,
  );
  if (
    !isDeepStrictEqual(
      [...canonicalNames].sort(),
      [...pluginDirectories].sort(),
    )
  ) {
    fail(
      context,
      `${CANONICAL_MARKETPLACE_PATH} plugins and plugins/ directories must match exactly.`,
    );
  }

  checkCatalogSources(context, canonicalNames, claudeCatalog, codexCatalog);
  for (const pluginName of canonicalNames) {
    await checkPlugin(context, pluginName);
  }

  await checkAgentsPluginContents(context);
  await checkWorkflowPermissions(context);
  await checkCompilerContract(context);
  return context.errors;
}

function canonicalPluginNames(context, canonical) {
  if (!Array.isArray(canonical.plugins) || canonical.plugins.length === 0) {
    fail(
      context,
      `${CANONICAL_MARKETPLACE_PATH} must contain a non-empty plugins array.`,
    );
    return [];
  }
  const names = [];
  const seen = new Set();
  for (const [index, pluginName] of canonical.plugins.entries()) {
    if (typeof pluginName !== "string" || !KEBAB_CASE.test(pluginName)) {
      fail(
        context,
        `${CANONICAL_MARKETPLACE_PATH}.plugins[${index}] must be lowercase kebab-case.`,
      );
      continue;
    }
    if (seen.has(pluginName)) {
      fail(context, `${CANONICAL_MARKETPLACE_PATH} repeats ${pluginName}.`);
    }
    seen.add(pluginName);
    names.push(pluginName);
  }
  return names;
}

function claudePluginNames(context, catalog) {
  if (!Array.isArray(catalog.plugins)) {
    fail(context, `${CLAUDE_MARKETPLACE_PATH} must contain a plugins array.`);
    return [];
  }
  return catalog.plugins.map((entry, index) => {
    if (!isPlainObject(entry) || typeof entry.name !== "string") {
      fail(
        context,
        `${CLAUDE_MARKETPLACE_PATH}.plugins[${index}] must contain a name.`,
      );
      return "";
    }
    return entry.name;
  });
}

function codexPluginNames(context, catalog) {
  if (!Array.isArray(catalog.plugins)) {
    fail(context, `${CODEX_MARKETPLACE_PATH} must contain a plugins array.`);
    return [];
  }
  return catalog.plugins.map((entry, index) => {
    if (!isPlainObject(entry) || typeof entry.name !== "string") {
      fail(
        context,
        `${CODEX_MARKETPLACE_PATH}.plugins[${index}] must contain a name.`,
      );
      return "";
    }
    return entry.name;
  });
}

function checkExactOrder(context, canonicalNames, actualNames, artifactPath) {
  if (!isDeepStrictEqual(actualNames, canonicalNames)) {
    fail(
      context,
      `${artifactPath} plugin order and set must equal ${CANONICAL_MARKETPLACE_PATH}.`,
    );
  }
}

function checkCatalogSources(
  context,
  canonicalNames,
  claudeCatalog,
  codexCatalog,
) {
  for (const [index, pluginName] of canonicalNames.entries()) {
    const expectedSource = `./plugins/${pluginName}`;
    const claudeEntry = claudeCatalog.plugins?.[index];
    if (claudeEntry?.source !== expectedSource) {
      fail(
        context,
        `${CLAUDE_MARKETPLACE_PATH} source for ${pluginName} must be "${expectedSource}".`,
      );
    }
    const codexSource = codexCatalog.plugins?.[index]?.source;
    if (
      !isDeepStrictEqual(codexSource, {
        source: "local",
        path: expectedSource,
      })
    ) {
      fail(
        context,
        `${CODEX_MARKETPLACE_PATH} source for ${pluginName} must be local path "${expectedSource}".`,
      );
    }
  }
}

async function checkPlugin(context, pluginName) {
  const pluginRoot = `plugins/${pluginName}`;
  const canonicalPath = `${pluginRoot}/.axiom/plugin.json`;
  const claudeManifestPath = `${pluginRoot}/.claude-plugin/plugin.json`;
  const codexManifestPath = `${pluginRoot}/.codex-plugin/plugin.json`;
  const readmePath = `${pluginRoot}/README.md`;
  const packagePath = `${pluginRoot}/package.json`;
  const releaseConfigPath = `${pluginRoot}/release.config.js`;

  for (const requiredPath of [
    canonicalPath,
    claudeManifestPath,
    codexManifestPath,
    readmePath,
    `${pluginRoot}/CHANGELOG.md`,
    packagePath,
    releaseConfigPath,
  ]) {
    await expectFile(context, requiredPath);
  }

  const canonical = await readJson(context, canonicalPath);
  const claudeManifest = await readJson(context, claudeManifestPath);
  const codexManifest = await readJson(context, codexManifestPath);
  for (const [manifestPath, manifest] of [
    [claudeManifestPath, claudeManifest],
    [codexManifestPath, codexManifest],
  ]) {
    for (const field of COMMON_METADATA_FIELDS) {
      if (!isDeepStrictEqual(manifest[field], canonical[field])) {
        fail(
          context,
          `${manifestPath}.${field} must equal ${canonicalPath}.${field}.`,
        );
      }
    }
  }

  if (claudeManifest.displayName !== canonical.displayName) {
    fail(
      context,
      `${claudeManifestPath}.displayName must equal ${canonicalPath}.displayName.`,
    );
  }
  if (codexManifest.skills !== canonical.components?.skills) {
    fail(
      context,
      `${codexManifestPath}.skills must equal ${canonicalPath}.components.skills.`,
    );
  }

  checkReadmeEvalHistory(
    context,
    readmePath,
    await readText(context, readmePath),
  );
  await checkPackageRuntimeIndependence(context, packagePath);
  await checkSkills(context, pluginName);
}

async function checkPackageRuntimeIndependence(context, packagePath) {
  const packageRecord = await readJson(context, packagePath);
  for (const field of RUNTIME_DEPENDENCY_FIELDS) {
    if (!Object.hasOwn(packageRecord, field)) {
      continue;
    }
    const value = packageRecord[field];
    const emptyObject = isPlainObject(value) && Object.keys(value).length === 0;
    const emptyArray = Array.isArray(value) && value.length === 0;
    if (!emptyObject && !emptyArray) {
      fail(
        context,
        `${packagePath}.${field} must be absent or empty; shipped plugins cannot depend on root npm runtime packages.`,
      );
    }
  }
}

async function checkSkills(context, pluginName) {
  const skillsPath = `plugins/${pluginName}/skills`;
  const entries = await readDirectory(context, skillsPath);
  const skillDirectories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (!entry.name.startsWith(".") && !entry.isDirectory()) {
      fail(context, `${skillsPath} may only contain directory-format skills.`);
    }
  }
  if (skillDirectories.length === 0) {
    fail(context, `${skillsPath} must contain at least one skill directory.`);
  }

  for (const entry of skillDirectories) {
    const skillName = entry.name;
    const skillRoot = `${skillsPath}/${skillName}`;
    const skillPath = `${skillRoot}/SKILL.md`;
    const evalPath = `${skillRoot}/evals/evals.json`;
    if (!KEBAB_CASE.test(skillName)) {
      fail(context, `${skillRoot} must be lowercase kebab-case.`);
    }
    await expectFile(context, skillPath);
    await expectFile(context, evalPath);
    checkSkillFrontmatter(
      context,
      skillPath,
      skillName,
      await readText(context, skillPath),
    );
    const evalManifest = await readJson(context, evalPath);
    if (evalManifest.skill_name !== skillName) {
      fail(context, `${evalPath} skill_name must be "${skillName}".`);
    }
    if (!Array.isArray(evalManifest.evals) || evalManifest.evals.length === 0) {
      fail(context, `${evalPath} must contain a non-empty evals array.`);
    }
  }
}

function checkSkillFrontmatter(context, skillPath, skillName, text) {
  const match = text.match(/^---\r?\n(?<yaml>[\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match?.groups) {
    fail(context, `${skillPath} must contain YAML frontmatter.`);
    return;
  }
  let frontmatter;
  try {
    frontmatter = YAML.parse(match.groups.yaml);
  } catch (error) {
    fail(context, `${skillPath} frontmatter is invalid YAML: ${error.message}`);
    return;
  }
  if (!isPlainObject(frontmatter)) {
    fail(context, `${skillPath} frontmatter must be a mapping.`);
    return;
  }
  if (frontmatter.name !== skillName) {
    fail(context, `${skillPath} name must be "${skillName}".`);
  }
  if (
    typeof frontmatter.description !== "string" ||
    frontmatter.description.trim() === ""
  ) {
    fail(context, `${skillPath} description must be non-blank.`);
  }
}

function checkReadmeEvalHistory(context, readmePath, readme) {
  const match = /^## Eval history\s*$/mu.exec(readme);
  if (!match) {
    fail(context, `${readmePath} must include ## Eval history.`);
    return;
  }
  const afterHeading = readme.slice(match.index + match[0].length);
  const nextHeadingIndex = afterHeading.search(/^## /mu);
  const section =
    nextHeadingIndex === -1
      ? afterHeading
      : afterHeading.slice(0, nextHeadingIndex);
  const meaningfulLines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("<!--"));
  if (meaningfulLines.length === 0) {
    fail(context, `${readmePath} ## Eval history must be non-empty.`);
  }
}

async function checkAgentsPluginContents(context) {
  const rootPath = ".agents/plugins";
  const entries = await readDirectory(context, rootPath);
  const actual = entries.map((entry) => entry.name).sort();
  const expected = [path.basename(CODEX_MARKETPLACE_PATH)];
  if (!isDeepStrictEqual(actual, expected)) {
    fail(
      context,
      `${rootPath} may contain only ${CODEX_MARKETPLACE_PATH}; found: ${actual.join(", ") || "none"}.`,
    );
  }
  for (const entry of entries) {
    const entryPath = `${rootPath}/${entry.name}`;
    const entryStats = await lstat(path.join(context.root, entryPath)).catch(
      () => null,
    );
    if (!entryStats?.isFile() || entryStats.isSymbolicLink()) {
      fail(context, `${entryPath} must be a regular file.`);
    }
  }
}

async function checkCompilerContract(context) {
  let contract;
  try {
    contract = await loadMarketplaceContract(context.root);
  } catch (error) {
    fail(context, `Canonical marketplace contract failed: ${error.message}`);
    return;
  }
  let outputs;
  try {
    outputs = renderMarketplaceOutputs(contract);
  } catch (error) {
    fail(context, `Marketplace rendering failed: ${error.message}`);
    return;
  }
  const stalePaths = await compareGeneratedOutputs(context.root, outputs);
  for (const stalePath of stalePaths) {
    fail(
      context,
      `${stalePath} is generated and out of date; run npm run marketplaces:build.`,
    );
  }
}

async function checkWorkflowPermissions(context) {
  const workflowsPath = ".github/workflows";
  const entries = await readDirectory(context, workflowsPath);
  const workflowFiles = entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  for (const fileName of workflowFiles) {
    const relativePath = `${workflowsPath}/${fileName}`;
    const text = await readText(context, relativePath);
    let root;
    try {
      const document = YAML.parseDocument(text);
      if (document.errors.length > 0) {
        fail(
          context,
          `${relativePath} is not valid YAML: ${document.errors[0].message}`,
        );
        continue;
      }
      root = document.toJS();
    } catch (error) {
      fail(context, `${relativePath} is not valid YAML: ${error.message}`);
      continue;
    }
    if (!isPlainObject(root)) {
      fail(context, `${relativePath} must be a YAML mapping.`);
      continue;
    }
    if (Object.hasOwn(root, "permissions")) {
      continue;
    }
    const jobs = root.jobs;
    if (!isPlainObject(jobs) || Object.keys(jobs).length === 0) {
      fail(
        context,
        `${relativePath} must declare top-level permissions or jobs with explicit permissions.`,
      );
      continue;
    }
    const missing = Object.entries(jobs)
      .filter(
        ([, job]) => !isPlainObject(job) || !Object.hasOwn(job, "permissions"),
      )
      .map(([jobName]) => jobName);
    if (missing.length > 0) {
      fail(
        context,
        `${relativePath} must declare top-level permissions or set permissions on every job; missing on: ${missing.join(", ")}.`,
      );
    }
  }
}

async function readDirectory(context, relativePath) {
  return readdir(path.join(context.root, relativePath), {
    withFileTypes: true,
  }).catch((error) => {
    fail(
      context,
      `${relativePath} must exist and be readable: ${error.message}`,
    );
    return [];
  });
}

async function listDirectories(context, relativePath) {
  const entries = await readDirectory(context, relativePath);
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

async function readJson(context, relativePath) {
  const text = await readText(context, relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(context, `${relativePath} is not valid JSON: ${error.message}`);
    return {};
  }
}

async function readText(context, relativePath) {
  return readFile(path.join(context.root, relativePath), "utf8").catch(
    (error) => {
      fail(context, `Could not read ${relativePath}: ${error.message}`);
      return "";
    },
  );
}

async function expectFile(context, relativePath) {
  const absolutePath = path.join(context.root, relativePath);
  try {
    const fileStats = await stat(absolutePath);
    if (!fileStats.isFile()) {
      fail(context, `${relativePath} must be a file.`);
    }
  } catch (error) {
    fail(context, `${relativePath} must exist: ${error.message}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(context, message) {
  context.errors.push(message);
}

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) {
    return DEFAULT_ROOT;
  }
  if (argumentsList.length === 2 && argumentsList[0] === "--root") {
    return path.resolve(argumentsList[1]);
  }
  throw new Error(
    "Usage: node .github/scripts/check-repo-invariants.mjs [--root <root>]",
  );
}

async function main() {
  const root = parseArguments(process.argv.slice(2));
  const errors = await checkRepositoryInvariants(root);
  if (errors.length > 0) {
    console.error("Repository invariant check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Repository invariants passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
