#!/usr/bin/env node
// Keeps the top-level README plugin version badges in sync with canonical Axiom
// metadata. The badges read canonical versions from main.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMarketplaceContract } from "./lib/marketplace-contract.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const README_PATH = path.join(REPO_ROOT, "README.md");
const START = "<!-- plugin-badges:start -->";
const END = "<!-- plugin-badges:end -->";
const BADGE_BRANCH = process.env.BADGE_BRANCH ?? "main";

const checkMode = process.argv.includes("--check");

const contract = await loadMarketplaceContract(REPO_ROOT);
const plugins = collectPlugins(contract);
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

function collectPlugins({ plugins }) {
  const result = [];
  let repositorySlug;

  for (const plugin of plugins) {
    const sourcePath = `plugins/${plugin.name}`;
    const currentSlug = parseGitHubRepository(plugin.metadata.repository);
    repositorySlug ??= currentSlug;

    if (currentSlug !== repositorySlug) {
      throw new Error(
        `${plugin.canonicalPath} repository "${plugin.metadata.repository}" does not match ${repositorySlug}.`,
      );
    }

    const manifestUrlPath = path.posix.join(sourcePath, ".axiom/plugin.json");

    result.push({
      name: plugin.name,
      changelogPath: path.posix.join(sourcePath, "CHANGELOG.md"),
      manifestUrl: `https://raw.githubusercontent.com/${repositorySlug}/${BADGE_BRANCH}/${manifestUrlPath}`,
    });
  }

  return result;
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
    color: "4c6ef5",
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
