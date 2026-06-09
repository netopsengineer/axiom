#!/usr/bin/env node
// Keeps the top-level README plugin version badges in sync with the canonical
// marketplace catalog. The badges read versions from each shipped plugin
// manifest on main, which is the file semantic-release updates.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const README_PATH = path.join(REPO_ROOT, "README.md");
const MARKETPLACE_PATH = path.join(
  REPO_ROOT,
  ".claude-plugin/marketplace.json",
);
const START = "<!-- plugin-badges:start -->";
const END = "<!-- plugin-badges:end -->";
const BADGE_BRANCH = process.env.BADGE_BRANCH ?? "main";

const checkMode = process.argv.includes("--check");

const marketplace = await readJson(MARKETPLACE_PATH);
const plugins = await collectPlugins(marketplace);
const block = renderBadgeBlock(plugins);
const readme = await readFile(README_PATH, "utf8");
const nextReadme = syncBlock(readme, block);

if (checkMode) {
  if (nextReadme !== readme) {
    console.error(
      "README.md plugin badge block is out of date. Run `npm run docs:badges`.",
    );
    process.exit(1);
  }

  console.log("README.md plugin badge block is current.");
  process.exit(0);
}

if (nextReadme === readme) {
  console.log("README.md plugin badge block already current.");
  process.exit(0);
}

await writeFile(README_PATH, nextReadme);
console.log("Updated README.md plugin badge block.");

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Could not parse ${relativePath(filePath)}: ${error.message}`,
    );
  }
}

async function collectPlugins({ plugins }) {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new Error(
      ".claude-plugin/marketplace.json must list at least one plugin.",
    );
  }

  const result = [];
  let repositorySlug;

  for (const plugin of plugins) {
    validateMarketplacePlugin(plugin);

    const sourcePath = plugin.source.replace(/^\.\//u, "");
    const manifestPath = path.join(
      REPO_ROOT,
      sourcePath,
      ".claude-plugin/plugin.json",
    );
    const manifest = await readJson(manifestPath);

    if (manifest.name !== plugin.name) {
      throw new Error(
        `${relativePath(manifestPath)} name "${manifest.name}" does not match marketplace entry "${plugin.name}".`,
      );
    }

    const currentSlug = parseGitHubRepository(manifest.repository);
    repositorySlug ??= currentSlug;

    if (currentSlug !== repositorySlug) {
      throw new Error(
        `${relativePath(manifestPath)} repository "${manifest.repository}" does not match ${repositorySlug}.`,
      );
    }

    const manifestUrlPath = path.posix.join(
      sourcePath,
      ".claude-plugin/plugin.json",
    );

    result.push({
      name: plugin.name,
      changelogPath: path.posix.join(sourcePath, "CHANGELOG.md"),
      manifestUrl: `https://raw.githubusercontent.com/${repositorySlug}/${BADGE_BRANCH}/${manifestUrlPath}`,
    });
  }

  return result;
}

function validateMarketplacePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error("Every marketplace plugin entry must be an object.");
  }

  if (
    typeof plugin.name !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(plugin.name)
  ) {
    throw new Error(`Invalid marketplace plugin name: ${plugin.name}`);
  }

  const expectedSource = `./plugins/${plugin.name}`;

  if (plugin.source !== expectedSource) {
    throw new Error(
      `Marketplace source for ${plugin.name} must be "${expectedSource}", got "${plugin.source}".`,
    );
  }
}

function parseGitHubRepository(repository) {
  if (typeof repository !== "string" || repository.length === 0) {
    throw new Error("Plugin manifests must include a GitHub repository URL.");
  }

  const shorthand = repository.match(
    /^(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+)$/u,
  );

  if (shorthand?.groups) {
    return `${shorthand.groups.owner}/${stripGitSuffix(shorthand.groups.repo)}`;
  }

  const url = repository.match(
    /github\.com[:/](?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/u,
  );

  if (!url?.groups) {
    throw new Error(`Unsupported GitHub repository value: ${repository}`);
  }

  return `${url.groups.owner}/${stripGitSuffix(url.groups.repo)}`;
}

function stripGitSuffix(value) {
  return value.replace(/\.git$/u, "");
}

function renderBadgeBlock(plugins) {
  const badges = plugins
    .map(
      ({ name, changelogPath, manifestUrl }) =>
        `[![${name}](${renderBadgeUrl({ name, manifestUrl })})](${changelogPath})`,
    )
    .join("\n");

  return `${START}\n${badges}\n${END}`;
}

function renderBadgeUrl({ name, manifestUrl }) {
  const params = new URLSearchParams({
    url: manifestUrl,
    query: "$.version",
    prefix: "v",
    label: name,
    style: "for-the-badge",
    logo: "claude",
    logoColor: "white",
    color: "8957e5",
    labelColor: "1a1a1a",
  });

  return `https://img.shields.io/badge/dynamic/json?${params.toString()}`;
}

function syncBlock(readmeContent, blockContent) {
  const startIndex = readmeContent.indexOf(START);
  const endIndex = readmeContent.indexOf(END);

  if (startIndex !== -1 || endIndex !== -1) {
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error("README.md has an incomplete plugin badge marker block.");
    }

    const before = readmeContent.slice(0, startIndex).replace(/\n*$/u, "\n\n");
    const after = readmeContent
      .slice(endIndex + END.length)
      .replace(/^\n*/u, "\n\n");

    return `${before}${blockContent}${after}`;
  }

  const lines = readmeContent.split("\n");
  const insertionIndex = findBadgeBlockInsertionIndex(lines);

  lines.splice(insertionIndex, 1, "", blockContent, "");
  return lines.join("\n");
}

function findBadgeBlockInsertionIndex(lines) {
  let sawBadge = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith("[![")) {
      sawBadge = true;
      continue;
    }

    if (sawBadge && line === "") {
      return index;
    }
  }

  throw new Error(
    "Could not find README.md badge section for plugin badge block.",
  );
}

function relativePath(filePath) {
  return path.relative(REPO_ROOT, filePath);
}
