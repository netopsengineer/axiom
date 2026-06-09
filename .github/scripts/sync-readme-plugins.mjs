#!/usr/bin/env node
// Keeps the top-level README plugin list in sync with the canonical marketplace
// catalog. The marketplace owns plugin names, descriptions, categories, and
// display order; plugin READMEs own detailed docs.
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const README_PATH = path.join(REPO_ROOT, "README.md");
const MARKETPLACE_PATH = path.join(
  REPO_ROOT,
  ".claude-plugin/marketplace.json",
);
const START = "<!-- plugin-list:start -->";
const END = "<!-- plugin-list:end -->";
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const checkMode = process.argv.includes("--check");

const marketplace = await readJson(MARKETPLACE_PATH);
const plugins = await collectPlugins(marketplace);
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
  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new Error(
      ".claude-plugin/marketplace.json must list at least one plugin.",
    );
  }

  const result = [];

  for (const plugin of plugins) {
    validateMarketplacePlugin(plugin);

    const sourcePath = plugin.source.replace(/^\.\//u, "");
    const pluginPath = path.join(REPO_ROOT, sourcePath);
    const readmePath = path.join(pluginPath, "README.md");
    const manifestPath = path.join(pluginPath, ".claude-plugin/plugin.json");

    await assertFileExists(readmePath);
    const manifest = await readJson(manifestPath);
    validatePluginManifest(manifest, { manifestPath, plugin });

    result.push({
      name: plugin.name,
      sourcePath,
      description: plugin.description.trim(),
      category: plugin.category.trim(),
    });
  }

  return result;
}

async function readText(filePath) {
  return readFile(filePath, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`Missing ${relativePath(filePath)}.`);
    }

    throw error;
  });
}

async function readJson(filePath) {
  const raw = await readText(filePath);

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Could not parse ${relativePath(filePath)}: ${error.message}`,
    );
  }
}

async function assertFileExists(filePath) {
  await access(filePath).catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`Missing ${relativePath(filePath)}.`);
    }

    throw error;
  });
}

function validateMarketplacePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error("Every marketplace plugin entry must be an object.");
  }

  if (typeof plugin.name !== "string" || !KEBAB_CASE.test(plugin.name)) {
    throw new Error(`Invalid marketplace plugin name: ${plugin.name}`);
  }

  const expectedSource = `./plugins/${plugin.name}`;

  if (plugin.source !== expectedSource) {
    throw new Error(
      `Marketplace source for ${plugin.name} must be "${expectedSource}", got "${plugin.source}".`,
    );
  }

  assertNonEmptyString(plugin.description, `${plugin.name} description`);
  assertNonEmptyString(plugin.category, `${plugin.name} category`);
}

function validatePluginManifest(manifest, { manifestPath, plugin }) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(
      `${relativePath(manifestPath)} must contain a JSON object.`,
    );
  }

  if (manifest.name !== plugin.name) {
    throw new Error(
      `${relativePath(manifestPath)} name "${manifest.name}" does not match marketplace entry "${plugin.name}".`,
    );
  }

  assertNonEmptyString(
    manifest.description,
    `${relativePath(manifestPath)} description`,
  );
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
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

Category: \`${plugin.category}\`

\`\`\`shell
/plugin install ${plugin.name}@axiom
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
