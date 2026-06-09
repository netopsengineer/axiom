#!/usr/bin/env node
// Keeps the top-level README eval index in sync with the canonical marketplace
// catalog and each shipped skill's eval manifest. The scored histories stay in
// plugin READMEs; this script indexes and enforces their presence.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const README_PATH = path.join(REPO_ROOT, "README.md");
const MARKETPLACE_PATH = path.join(
  REPO_ROOT,
  ".claude-plugin/marketplace.json",
);
const START = "<!-- eval-index:start -->";
const END = "<!-- eval-index:end -->";
const EVAL_HISTORY_HEADING = /^## Eval history\s*$/mu;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const checkMode = process.argv.includes("--check");

const marketplace = await readJson(MARKETPLACE_PATH);
const rows = await collectEvalRows(marketplace);
const block = renderEvalBlock(rows);
const readme = await readFile(README_PATH, "utf8");
const nextReadme = syncBlock(readme, block);

if (checkMode) {
  if (nextReadme !== readme) {
    console.error(
      "README.md eval index is out of date. Run `npm run docs:evals`.",
    );
    process.exit(1);
  }

  console.log("README.md eval index is current.");
  process.exit(0);
}

if (nextReadme === readme) {
  console.log("README.md eval index already current.");
  process.exit(0);
}

await writeFile(README_PATH, nextReadme);
console.log("Updated README.md eval index.");

async function collectEvalRows({ plugins }) {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new Error(
      ".claude-plugin/marketplace.json must list at least one plugin.",
    );
  }

  const rows = [];

  for (const plugin of plugins) {
    validateMarketplacePlugin(plugin);

    const sourcePath = plugin.source.replace(/^\.\//u, "");
    const pluginPath = path.join(REPO_ROOT, sourcePath);
    const pluginReadmePath = path.join(pluginPath, "README.md");
    const pluginReadme = await readText(pluginReadmePath);

    const evalHistory = findEvalHistorySection(pluginReadme);

    if (!evalHistory) {
      throw new Error(
        `${relativePath(pluginReadmePath)} must include a "## Eval history" section.`,
      );
    }

    if (evalHistory.trim().length === 0) {
      throw new Error(
        `${relativePath(pluginReadmePath)} "## Eval history" section must not be empty.`,
      );
    }

    const skillDirs = await collectSkillDirs(path.join(pluginPath, "skills"));

    if (skillDirs.length === 0) {
      throw new Error(`${sourcePath} must ship at least one skill directory.`);
    }

    const skills = [];

    for (const skillName of skillDirs) {
      validateSkillName(skillName, path.join(sourcePath, "skills", skillName));

      const evalPath = path.join(
        pluginPath,
        "skills",
        skillName,
        "evals/evals.json",
      );
      const manifest = await readJson(evalPath);
      validateEvalManifest(manifest, { skillName, evalPath });

      skills.push({
        name: skillName,
        evalPath: relativePath(evalPath),
        scenarios: manifest.evals.length,
        rubricChecks: countRubricChecks(manifest.evals),
      });
    }

    rows.push({
      name: plugin.name,
      pluginPath: sourcePath,
      skills,
      scenarios: sumBy(skills, "scenarios"),
      rubricChecks: sumBy(skills, "rubricChecks"),
    });
  }

  return rows;
}

async function collectSkillDirs(skillsPath) {
  const entries = await readdir(skillsPath, { withFileTypes: true }).catch(
    (error) => {
      if (error.code === "ENOENT") {
        throw new Error(`${relativePath(skillsPath)} must exist.`);
      }

      throw error;
    },
  );

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
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
}

function validateSkillName(skillName, skillPath) {
  if (!KEBAB_CASE.test(skillName)) {
    throw new Error(`Invalid skill directory name: ${skillPath}`);
  }
}

function validateEvalManifest(manifest, { skillName, evalPath }) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${relativePath(evalPath)} must contain a JSON object.`);
  }

  if (manifest.skill_name !== skillName) {
    throw new Error(
      `${relativePath(evalPath)} skill_name must be "${skillName}", got "${manifest.skill_name}".`,
    );
  }

  if (!Array.isArray(manifest.evals) || manifest.evals.length === 0) {
    throw new Error(`${relativePath(evalPath)} must list at least one eval.`);
  }

  for (const [index, evalCase] of manifest.evals.entries()) {
    validateEvalCase(evalCase, {
      evalPath,
      label: `${skillName} eval ${index + 1}`,
    });
  }
}

function validateEvalCase(evalCase, { evalPath, label }) {
  if (!evalCase || typeof evalCase !== "object" || Array.isArray(evalCase)) {
    throw new Error(`${relativePath(evalPath)} ${label} must be an object.`);
  }

  if (
    (typeof evalCase.id !== "number" && typeof evalCase.id !== "string") ||
    `${evalCase.id}`.trim().length === 0
  ) {
    throw new Error(`${relativePath(evalPath)} ${label} must include an id.`);
  }

  assertNonEmptyString(evalCase.prompt, evalPath, `${label} prompt`);
  assertNonEmptyString(
    evalCase.expected_output,
    evalPath,
    `${label} expected_output`,
  );

  if (
    !Array.isArray(evalCase.expectations) ||
    evalCase.expectations.length === 0
  ) {
    throw new Error(
      `${relativePath(evalPath)} ${label} must list at least one expectation.`,
    );
  }

  for (const expectation of evalCase.expectations) {
    assertNonEmptyString(expectation, evalPath, `${label} expectation`);
  }

  if (evalCase.files !== undefined) {
    if (!Array.isArray(evalCase.files)) {
      throw new Error(
        `${relativePath(evalPath)} ${label} files must be an array.`,
      );
    }

    for (const file of evalCase.files) {
      assertNonEmptyString(file, evalPath, `${label} file`);
    }
  }
}

function assertNonEmptyString(value, filePath, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${relativePath(filePath)} ${label} must be a string.`);
  }
}

function countRubricChecks(evals) {
  return evals.reduce(
    (total, evalCase) => total + evalCase.expectations.length,
    0,
  );
}

function sumBy(items, property) {
  return items.reduce((total, item) => total + item[property], 0);
}

function renderEvalBlock(rows) {
  const totalSkills = rows.reduce((total, row) => total + row.skills.length, 0);
  const totalScenarios = sumBy(rows, "scenarios");
  const totalRubricChecks = sumBy(rows, "rubricChecks");
  const table = renderMarkdownTable({
    headers: [
      "Plugin",
      "Evaluated skill manifests",
      "Scenarios",
      "Manifest expectations",
      "Scored history",
    ],
    alignments: ["left", "left", "right", "right", "left"],
    rows: rows.map(renderTableRow),
  });

  return `${START}
The eval index is generated from \`.claude-plugin/marketplace.json\` and each
shipped skill's \`evals/evals.json\` manifest. Plugin READMEs are the canonical
scored histories.

${table}

Current coverage: **${rows.length} plugins**, **${totalSkills} evaluated skills**,
**${totalScenarios} scenarios**, **${totalRubricChecks} manifest expectations**.
${END}`;
}

function renderTableRow(row) {
  return [
    `[${row.name}](${row.pluginPath}/README.md)`,
    row.skills.map(renderSkillLink).join(", "),
    row.scenarios,
    row.rubricChecks,
    `[Eval history](${row.pluginPath}/README.md#eval-history)`,
  ];
}

function renderSkillLink(skill) {
  return `[${skill.name}](${skill.evalPath})`;
}

function renderMarkdownTable({ headers, alignments, rows }) {
  const stringRows = rows.map((row) => row.map(String));
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...stringRows.map((row) => row[index].length)),
  );
  const headerLine = renderMarkdownTableRow(
    headers,
    widths,
    headers.map(() => "left"),
  );
  const separatorLine = `|${widths
    .map((width, index) => renderSeparatorCell(width, alignments[index]))
    .join("|")}|`;
  const bodyLines = stringRows.map((row) =>
    renderMarkdownTableRow(row, widths, alignments),
  );

  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

function renderMarkdownTableRow(cells, widths, alignments) {
  const paddedCells = cells.map((cell, index) =>
    renderMarkdownTableCell(cell, widths[index], alignments[index]),
  );

  return `|${paddedCells.join("|")}|`;
}

function renderMarkdownTableCell(cell, width, alignment) {
  const content =
    alignment === "right" ? cell.padStart(width) : cell.padEnd(width);

  return ` ${content} `;
}

function renderSeparatorCell(width, alignment) {
  if (alignment === "right") {
    return `${"-".repeat(width + 1)}:`;
  }

  return "-".repeat(width + 2);
}

function findEvalHistorySection(markdown) {
  const match = markdown.match(EVAL_HISTORY_HEADING);

  if (!match || match.index === undefined) {
    return undefined;
  }

  const afterHeading = markdown.slice(match.index + match[0].length);
  const nextHeadingIndex = afterHeading.search(/^## /mu);

  if (nextHeadingIndex === -1) {
    return afterHeading;
  }

  return afterHeading.slice(0, nextHeadingIndex);
}

function syncBlock(readmeContent, blockContent) {
  const startIndex = readmeContent.indexOf(START);
  const endIndex = readmeContent.indexOf(END);

  if (startIndex !== -1 || endIndex !== -1) {
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error("README.md has an incomplete eval index marker block.");
    }

    const before = readmeContent.slice(0, startIndex).replace(/\n*$/u, "\n\n");
    const after = readmeContent
      .slice(endIndex + END.length)
      .replace(/^\n*/u, "\n\n");

    return `${before}${blockContent}${after}`;
  }

  const insertionMarker = "\n## Add the marketplace\n";
  const insertionIndex = readmeContent.indexOf(insertionMarker);

  if (insertionIndex === -1) {
    throw new Error(
      'Could not find README.md "## Add the marketplace" insertion point.',
    );
  }

  const before = readmeContent
    .slice(0, insertionIndex)
    .replace(/\n*$/u, "\n\n");
  const after = readmeContent.slice(insertionIndex).replace(/^\n*/u, "\n");

  return `${before}${blockContent}\n${after}`;
}

function relativePath(filePath) {
  return path
    .relative(REPO_ROOT, filePath)
    .split(path.sep)
    .join(path.posix.sep);
}
