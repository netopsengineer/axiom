#!/usr/bin/env node
// Keeps the top-level README plugin list in sync with canonical marketplace and
// plugin metadata. Plugin READMEs own detailed docs.
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMarketplaceContract } from "./lib/marketplace-contract.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const README_PATH = path.join(REPO_ROOT, "README.md");
const START = "<!-- plugin-list:start -->";
const END = "<!-- plugin-list:end -->";

const checkMode = process.argv.includes("--check");

const contract = await loadMarketplaceContract(REPO_ROOT);
const plugins = await collectPlugins(contract);
const block = renderPluginBlock(plugins);
const readme = await readFile(README_PATH, "utf8");
const nextReadme = syncBlock(readme, block);

if (checkMode) {
  if (nextReadme !== readme) {
    console.error(
      "README.md plugin list is out of date. Run `npm run docs:plugins`.",
    );
    process.exit(1);
  }

  console.log("README.md plugin list is current.");
  process.exit(0);
}

if (nextReadme === readme) {
  console.log("README.md plugin list already current.");
  process.exit(0);
}

await writeFile(README_PATH, nextReadme);
console.log("Updated README.md plugin list.");

async function collectPlugins({ plugins }) {
  const result = [];

  for (const plugin of plugins) {
    const sourcePath = `plugins/${plugin.name}`;
    const pluginPath = path.join(REPO_ROOT, sourcePath);
    const readmePath = path.join(pluginPath, "README.md");

    await assertFileExists(readmePath);

    result.push({
      name: plugin.name,
      sourcePath,
      description: plugin.metadata.description.trim(),
      claudeCategory: plugin.metadata.platforms.claude.category.trim(),
      codexCategory: plugin.metadata.platforms.codex.category.trim(),
    });
  }

  return result;
}

async function assertFileExists(filePath) {
  await access(filePath).catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`Missing ${relativePath(filePath)}.`);
    }

    throw error;
  });
}

function renderPluginBlock(plugins) {
  const body = plugins.map(renderPluginSection).join("\n\n");

  return `${START}
${body}
${END}`;
}

function renderPluginSection(plugin) {
  return `### [${plugin.name}](${plugin.sourcePath}/README.md)

${wrapText(plugin.description)}

Claude Code category: \`${plugin.claudeCategory}\`

Codex category: \`${plugin.codexCategory}\`

Claude Code:

\`\`\`shell
/plugin install ${plugin.name}@axiom
\`\`\`

Codex:

\`\`\`shell
codex plugin add ${plugin.name}@axiom
\`\`\``;
}

function syncBlock(readmeContent, blockContent) {
  const startIndex = readmeContent.indexOf(START);
  const endIndex = readmeContent.indexOf(END);

  if (startIndex !== -1 || endIndex !== -1) {
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error("README.md has an incomplete plugin list marker block.");
    }

    const before = readmeContent.slice(0, startIndex).replace(/\n*$/u, "\n\n");
    const after = readmeContent
      .slice(endIndex + END.length)
      .replace(/^\n*/u, "\n\n");

    return `${before}${blockContent}${after}`;
  }

  const heading = "\n## Plugins\n";
  const headingIndex = readmeContent.indexOf(heading);

  if (headingIndex === -1) {
    throw new Error('Could not find README.md "## Plugins" section.');
  }

  const bodyStart = headingIndex + heading.length;
  const nextHeadingIndex = readmeContent.slice(bodyStart).search(/^## /mu);

  if (nextHeadingIndex === -1) {
    throw new Error('Could not find section after README.md "## Plugins".');
  }

  const before = readmeContent.slice(0, bodyStart).replace(/\n*$/u, "\n\n");
  const after = readmeContent
    .slice(bodyStart + nextHeadingIndex)
    .replace(/^\n*/u, "\n\n");

  return `${before}${blockContent}${after}`;
}

function wrapText(value, width = 88) {
  const words = value.trim().split(/\s+/u);
  const lines = [];
  let line = "";

  for (const word of words) {
    if (line.length === 0) {
      line = word;
      continue;
    }

    if (`${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
      continue;
    }

    line = `${line} ${word}`;
  }

  if (line.length > 0) {
    lines.push(line);
  }

  return lines.join("\n");
}

function relativePath(filePath) {
  return path
    .relative(REPO_ROOT, filePath)
    .split(path.sep)
    .join(path.posix.sep);
}
