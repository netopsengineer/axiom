#!/usr/bin/env node
import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import YAML from "yaml";
import {
  CLAUDE_MARKETPLACE_PATH,
  CODEX_MARKETPLACE_PATH,
  compareGeneratedOutputs,
  loadMarketplaceContract,
  renderMarketplaceOutputs,
} from "./lib/marketplace-contract.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;

export async function validateCodexMarketplace(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const rootRealPath = await realpath(root);
  const canonicalPath = path.join(root, ".axiom/marketplace.json");
  const nativeCatalogPath = path.join(root, CODEX_MARKETPLACE_PATH);
  const canonical = await readJson(canonicalPath, root);
  const nativeCatalog = await readJson(nativeCatalogPath, root);

  requireExactKeys(
    nativeCatalog,
    ["name", "interface", "plugins"],
    CODEX_MARKETPLACE_PATH,
  );
  if (nativeCatalog.name !== canonical.name) {
    throw new Error(
      `${CODEX_MARKETPLACE_PATH} name differs from canonical name.`,
    );
  }
  requireExactKeys(
    nativeCatalog.interface,
    ["displayName"],
    `${CODEX_MARKETPLACE_PATH}.interface`,
  );
  if (nativeCatalog.interface.displayName !== canonical.displayName) {
    throw new Error(
      `${CODEX_MARKETPLACE_PATH} display name differs from canonical display name.`,
    );
  }
  if (
    !Array.isArray(canonical.plugins) ||
    !Array.isArray(nativeCatalog.plugins)
  ) {
    throw new Error(
      "Canonical and native catalogs must contain plugin arrays.",
    );
  }

  await rejectStaleNativeManifests(root, new Set(canonical.plugins));

  const nativeNames = nativeCatalog.plugins.map((entry, index) => {
    const entryPath = `${CODEX_MARKETPLACE_PATH}.plugins[${index}]`;
    requireExactKeys(
      entry,
      ["name", "source", "policy", "category"],
      entryPath,
    );
    requireExactKeys(entry.source, ["source", "path"], `${entryPath}.source`);
    requireExactKeys(
      entry.policy,
      ["installation", "authentication"],
      `${entryPath}.policy`,
    );
    return entry.name;
  });
  if (!isDeepStrictEqual(nativeNames, canonical.plugins)) {
    throw new Error(
      `${CODEX_MARKETPLACE_PATH} plugin order and set must match canonical plugins.`,
    );
  }

  const pluginDirectories = await listPluginDirectories(
    path.join(root, "plugins"),
  );
  if (!isDeepStrictEqual([...canonical.plugins].sort(), pluginDirectories)) {
    throw new Error(
      "Canonical plugins and plugin directories must match exactly.",
    );
  }

  for (const [index, pluginName] of canonical.plugins.entries()) {
    if (typeof pluginName !== "string" || !KEBAB_CASE.test(pluginName)) {
      throw new Error(`Invalid canonical plugin name at index ${index}.`);
    }
    const entry = nativeCatalog.plugins[index];
    const canonicalPluginPath = `plugins/${pluginName}/.axiom/plugin.json`;
    const nativeManifestPath = `plugins/${pluginName}/.codex-plugin/plugin.json`;
    const canonicalPlugin = await readJson(
      path.join(root, canonicalPluginPath),
      root,
    );
    const nativeManifest = await readJson(
      path.join(root, nativeManifestPath),
      root,
    );

    await validateLocalPath({
      basePath: root,
      baseRealPath: rootRealPath,
      relativePath: entry.source.path,
      valuePath: `${CODEX_MARKETPLACE_PATH} source for ${pluginName}`,
      expectedType: "directory",
    });

    const expectedSource = `./plugins/${pluginName}`;
    if (
      entry.name !== pluginName ||
      entry.source.source !== "local" ||
      entry.source.path !== expectedSource
    ) {
      throw new Error(
        `${CODEX_MARKETPLACE_PATH} entry ${pluginName} must use local source "${expectedSource}".`,
      );
    }
    if (
      !isDeepStrictEqual(entry.policy, canonicalPlugin.platforms?.codex?.policy)
    ) {
      throw new Error(
        `${CODEX_MARKETPLACE_PATH} policy drift for ${pluginName}.`,
      );
    }
    if (entry.category !== canonicalPlugin.platforms?.codex?.category) {
      throw new Error(
        `${CODEX_MARKETPLACE_PATH} category drift for ${pluginName}.`,
      );
    }

    const pluginRoot = path.join(root, "plugins", pluginName);
    const pluginRootRealPath = await realpath(pluginRoot);
    assertInside(rootRealPath, pluginRootRealPath, `plugins/${pluginName}`);

    validateNativeManifestShape(nativeManifest, nativeManifestPath);
    validateCommonMetadataParity(
      canonicalPlugin,
      nativeManifest,
      nativeManifestPath,
    );
    if (!SEMVER.test(nativeManifest.version)) {
      throw new Error(
        `${nativeManifestPath}.version must be a Semantic Version.`,
      );
    }
    if (nativeManifest.skills !== canonicalPlugin.components?.skills) {
      throw new Error(
        `${nativeManifestPath}.skills differs from canonical metadata.`,
      );
    }

    const skillsPath = await validateLocalPath({
      basePath: pluginRoot,
      baseRealPath: pluginRootRealPath,
      relativePath: nativeManifest.skills,
      valuePath: `${nativeManifestPath}.skills`,
      expectedType: "directory",
    });
    await validateSkills(skillsPath, pluginRootRealPath, pluginName);
    rejectForbiddenReferences(nativeCatalog, CODEX_MARKETPLACE_PATH);
    rejectForbiddenReferences(nativeManifest, nativeManifestPath);
  }

  const contract = await loadMarketplaceContract(root);
  const outputs = renderMarketplaceOutputs(contract);
  if (!(await pathExists(path.join(root, CLAUDE_MARKETPLACE_PATH)))) {
    outputs.delete(CLAUDE_MARKETPLACE_PATH);
  }
  const stalePaths = await compareGeneratedOutputs(root, outputs);
  if (stalePaths.length > 0) {
    throw new Error(
      `Generated marketplace drift: ${stalePaths.join(", ")}. Run npm run marketplaces:build.`,
    );
  }

  return {
    nativeOnly: !(await pathExists(path.join(root, CLAUDE_MARKETPLACE_PATH))),
    pluginNames: [...canonical.plugins],
  };
}

function validateNativeManifestShape(manifest, manifestPath) {
  requireExactKeys(
    manifest,
    [
      "name",
      "version",
      "description",
      "author",
      "repository",
      "license",
      "keywords",
      "skills",
      "interface",
    ],
    manifestPath,
  );
  requireExactKeys(
    manifest.interface,
    [
      "displayName",
      "shortDescription",
      "longDescription",
      "developerName",
      "category",
      "websiteURL",
      "defaultPrompt",
    ],
    `${manifestPath}.interface`,
  );

  for (const key of ["name", "version", "description", "skills"]) {
    if (typeof manifest[key] !== "string" || manifest[key].trim() === "") {
      throw new Error(`${manifestPath}.${key} must be a non-blank string.`);
    }
  }
}

function validateCommonMetadataParity(canonical, manifest, manifestPath) {
  const commonFields = [
    "name",
    "version",
    "description",
    "author",
    "repository",
    "license",
    "keywords",
  ];
  for (const field of commonFields) {
    if (!isDeepStrictEqual(manifest[field], canonical[field])) {
      throw new Error(
        `${manifestPath}.${field} differs from canonical metadata.`,
      );
    }
  }

  const expectedInterface = {
    displayName: canonical.displayName,
    shortDescription: canonical.platforms.codex.shortDescription,
    longDescription: canonical.description,
    developerName: canonical.author.name,
    category: canonical.platforms.codex.category,
    websiteURL: canonical.repository,
    defaultPrompt: canonical.platforms.codex.defaultPrompt,
  };
  if (!isDeepStrictEqual(manifest.interface, expectedInterface)) {
    throw new Error(
      `${manifestPath}.interface differs from canonical metadata.`,
    );
  }
}

async function validateSkills(skillsPath, pluginRootRealPath, pluginName) {
  const entries = await readdir(skillsPath, { withFileTypes: true });
  const skillDirectories = entries
    .filter((entry) => !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (skillDirectories.length === 0) {
    throw new Error(`plugins/${pluginName}/skills contains no skills.`);
  }

  for (const entry of skillDirectories) {
    const skillDirectory = path.join(skillsPath, entry.name);
    const skillStats = entry.isSymbolicLink()
      ? await stat(skillDirectory)
      : null;
    if (!entry.isDirectory() && !skillStats?.isDirectory()) {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name} is not a directory.`,
      );
    }
    const skillRealPath = await realpath(skillDirectory);
    assertInside(
      pluginRootRealPath,
      skillRealPath,
      `plugins/${pluginName}/skills/${entry.name}`,
    );

    const skillPath = path.join(skillDirectory, "SKILL.md");
    const skillText = await readFile(skillPath, "utf8").catch((error) => {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name}/SKILL.md is missing: ${error.message}`,
      );
    });
    const frontmatter = parseFrontmatter(
      skillText,
      `plugins/${pluginName}/skills/${entry.name}/SKILL.md`,
    );
    if (frontmatter.name !== entry.name) {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name}/SKILL.md name must be "${entry.name}".`,
      );
    }
    if (
      typeof frontmatter.description !== "string" ||
      frontmatter.description.trim() === ""
    ) {
      throw new Error(
        `plugins/${pluginName}/skills/${entry.name}/SKILL.md description must be non-blank.`,
      );
    }
  }
}

function parseFrontmatter(text, skillPath) {
  const match = text.match(/^---\r?\n(?<yaml>[\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match?.groups) {
    throw new Error(`${skillPath} must contain YAML frontmatter.`);
  }
  let frontmatter;
  try {
    frontmatter = YAML.parse(match.groups.yaml);
  } catch (error) {
    throw new Error(
      `${skillPath} frontmatter is invalid YAML: ${error.message}`,
    );
  }
  if (
    frontmatter === null ||
    typeof frontmatter !== "object" ||
    Array.isArray(frontmatter)
  ) {
    throw new Error(`${skillPath} frontmatter must be a mapping.`);
  }
  return frontmatter;
}

async function validateLocalPath({
  basePath,
  baseRealPath,
  relativePath,
  valuePath,
  expectedType,
}) {
  if (
    typeof relativePath !== "string" ||
    !relativePath.startsWith("./") ||
    relativePath.includes("\\")
  ) {
    throw new Error(`${valuePath} must be a normalized ./-prefixed path.`);
  }
  const withoutPrefix = relativePath.slice(2);
  const normalized = path.posix.normalize(withoutPrefix);
  if (
    withoutPrefix === "" ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`${valuePath} escapes its intended root.`);
  }

  const resolvedPath = path.resolve(basePath, relativePath);
  assertInside(basePath, resolvedPath, valuePath);
  const resolvedRealPath = await realpath(resolvedPath).catch((error) => {
    throw new Error(`${valuePath} target is missing: ${error.message}`);
  });
  assertInside(baseRealPath, resolvedRealPath, `${valuePath} canonical target`);
  const resolvedStats = await stat(resolvedPath);
  if (expectedType === "directory" && !resolvedStats.isDirectory()) {
    throw new Error(`${valuePath} target must be a directory.`);
  }
  return resolvedPath;
}

async function rejectStaleNativeManifests(root, registeredNames) {
  const pluginDirectories = await listPluginDirectories(
    path.join(root, "plugins"),
  );
  for (const pluginName of pluginDirectories) {
    if (registeredNames.has(pluginName)) {
      continue;
    }
    const manifestPath = `plugins/${pluginName}/.codex-plugin/plugin.json`;
    if (await pathExists(path.join(root, manifestPath))) {
      throw new Error(
        `Stale native manifest ${manifestPath}; remove it manually after confirming plugin removal.`,
      );
    }
  }
}

function rejectForbiddenReferences(value, valuePath) {
  const strings = [];
  collectStrings(value, strings);
  const homeDirectory = os.homedir();
  for (const text of strings) {
    if (
      text.includes("dev/") ||
      text.includes("node_modules") ||
      (homeDirectory !== "/" && text.includes(homeDirectory))
    ) {
      throw new Error(
        `${valuePath} contains a forbidden shipped path reference.`,
      );
    }
  }
}

function collectStrings(value, result) {
  if (typeof value === "string") {
    result.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, result);
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectStrings(item, result);
    }
  }
}

async function listPluginDirectories(pluginsPath) {
  const entries = await readdir(pluginsPath, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const entryPath = path.join(pluginsPath, entry.name);
    const entryStats = entry.isSymbolicLink() ? await stat(entryPath) : null;
    if (entry.isDirectory() || entryStats?.isDirectory()) {
      names.push(entry.name);
    }
  }
  return names.sort();
}

function requireExactKeys(value, expectedKeys, valuePath) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${valuePath} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (!isDeepStrictEqual(actualKeys, sortedExpectedKeys)) {
    throw new Error(
      `${valuePath} fields must be exactly: ${sortedExpectedKeys.join(", ")}.`,
    );
  }
}

async function readJson(filePath, root) {
  const relativePath = path.relative(root, filePath);
  const text = await readFile(filePath, "utf8").catch((error) => {
    throw new Error(`${relativePath} is missing: ${error.message}`);
  });
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${relativePath} is invalid JSON: ${error.message}`);
  }
}

async function pathExists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function assertInside(parentPath, candidatePath, description) {
  const relative = path.relative(parentPath, candidatePath);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`${description} must resolve inside ${parentPath}.`);
  }
}

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) {
    return DEFAULT_ROOT;
  }
  if (argumentsList.length === 2 && argumentsList[0] === "--root") {
    return path.resolve(argumentsList[1]);
  }
  throw new Error(
    "Usage: node .github/scripts/check-codex-marketplace.mjs [--root <root>]",
  );
}

async function main() {
  const root = parseArguments(process.argv.slice(2));
  const result = await validateCodexMarketplace(root);
  const mode = result.nativeOnly ? "native-only" : "coexistence";
  console.log(
    `Codex marketplace static validation passed (${mode}; ${result.pluginNames.length} plugins).`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
