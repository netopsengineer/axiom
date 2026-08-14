#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { generateNotes } from "@semantic-release/release-notes-generator";
import { loadMarketplaceContract } from "./lib/marketplace-contract.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export async function backfillPluginChangelog({
  repositoryRoot,
  pluginRoot,
  previousTag,
  releaseTag,
}) {
  const root = path.resolve(repositoryRoot);
  const requestedPluginRoot = path.resolve(pluginRoot);
  const pluginRealPath = await realpath(requestedPluginRoot).catch((error) => {
    throw new Error(
      `Changelog target ${requestedPluginRoot} must exist: ${error.message}`,
    );
  });
  const pluginsRootRealPath = await realpath(path.join(root, "plugins"));
  assertInside(pluginsRootRealPath, pluginRealPath, "changelog target");

  const contract = await loadMarketplaceContract(root);
  const selectedPlugin = contract.plugins.find(
    ({ root: registeredRoot }) =>
      path.resolve(registeredRoot) === requestedPluginRoot,
  );
  if (!selectedPlugin) {
    throw new Error(
      `Changelog target ${requestedPluginRoot} must be exactly one registered plugin directory.`,
    );
  }
  const registeredPluginRealPath = await realpath(selectedPlugin.root);
  if (registeredPluginRealPath !== pluginRealPath) {
    throw new Error(
      `Changelog target ${requestedPluginRoot} must not alias another plugin directory.`,
    );
  }

  const pluginName = selectedPlugin.name;
  const releasePrefix = `${pluginName}-v`;
  if (!releaseTag.startsWith(releasePrefix)) {
    throw new Error(
      `Release tag ${releaseTag} must start with ${releasePrefix}.`,
    );
  }
  const releaseVersion = releaseTag.slice(releasePrefix.length);
  if (!/^\d+\.\d+\.\d+$/u.test(releaseVersion)) {
    throw new Error(
      `Release tag ${releaseTag} must end with a semantic version.`,
    );
  }

  const relativePluginRoot = toGitPath(path.relative(root, pluginRealPath));
  const [releaseCommit, repositoryUrl, commitHashes] = await Promise.all([
    git(root, ["rev-parse", "--verify", `${releaseTag}^{commit}`]),
    git(root, ["remote", "get-url", "origin"]),
    git(root, [
      "log",
      "--reverse",
      "--format=%H",
      `${previousTag}..${releaseTag}`,
      "--",
      relativePluginRoot,
    ]),
  ]);

  await git(root, ["rev-parse", "--verify", `${previousTag}^{commit}`]);
  const commits = [];
  for (const hash of commitHashes.split("\n").filter(Boolean)) {
    const message = await git(root, ["show", "-s", "--format=%B", hash]);
    if (/^chore\(release\):/u.test(message)) {
      continue;
    }
    commits.push({ hash, message });
  }
  if (commits.length === 0) {
    throw new Error(
      `${releaseTag} has no non-release commits under ${relativePluginRoot}.`,
    );
  }

  const releaseConfiguration = (
    await import(pathToFileURL(path.join(pluginRealPath, "release.config.js")))
  ).default;
  const releaseNotesEntry = releaseConfiguration.plugins.find(
    (entry) =>
      Array.isArray(entry) &&
      entry[0] === "@semantic-release/release-notes-generator",
  );
  if (!releaseNotesEntry) {
    throw new Error(
      `${relativePluginRoot}/release.config.js must configure @semantic-release/release-notes-generator.`,
    );
  }

  const notes = await generateNotes(releaseNotesEntry[1], {
    commits,
    cwd: pluginRealPath,
    lastRelease: { gitTag: previousTag },
    nextRelease: {
      gitHead: releaseCommit,
      gitTag: releaseTag,
      version: releaseVersion,
    },
    options: { repositoryUrl },
  });
  const generatedBody = extractGeneratedBody(notes, releaseTag);

  const changelogPath = path.join(pluginRealPath, "CHANGELOG.md");
  const currentText = await readFile(changelogPath, "utf8");
  const nextText = fillEmptyReleaseSection({
    changelogText: currentText,
    generatedBody,
    releaseTag,
  });
  await writeFile(changelogPath, nextText, "utf8");

  return {
    changelogPath: toGitPath(path.relative(root, changelogPath)),
    commits: commits.map(({ hash }) => hash),
    pluginName,
    previousTag,
    releaseTag,
  };
}

export function extractGeneratedBody(notes, releaseTag) {
  const match = /^## [^\n]+\n\n(?<body>[\s\S]*\S)\s*$/u.exec(notes);
  if (!match?.groups?.body) {
    throw new Error(`${releaseTag} generated an empty release body.`);
  }
  return match.groups.body.trim();
}

export function fillEmptyReleaseSection({
  changelogText,
  generatedBody,
  releaseTag,
}) {
  const headings = [...changelogText.matchAll(/^## .+$/gmu)];
  const targetIndex = headings.findIndex(({ 0: heading }) =>
    heading.includes(`[${releaseTag}]`),
  );
  if (targetIndex === -1) {
    throw new Error(`CHANGELOG.md has no section for ${releaseTag}.`);
  }

  const target = headings[targetIndex];
  const lineEnd = changelogText.indexOf("\n", target.index);
  const sectionEnd = headings[targetIndex + 1]?.index ?? changelogText.length;
  const currentBody = changelogText.slice(lineEnd + 1, sectionEnd).trim();
  if (currentBody) {
    throw new Error(`${releaseTag} already has a non-empty release body.`);
  }

  return `${changelogText.slice(0, lineEnd + 1)}\n${generatedBody.trim()}\n\n${changelogText.slice(sectionEnd)}`;
}

export function findEmptyReleaseSections(changelogText) {
  const headings = [...changelogText.matchAll(/^## .+$/gmu)];
  const emptySections = [];
  for (const [index, heading] of headings.entries()) {
    const lineEnd = changelogText.indexOf("\n", heading.index);
    const sectionEnd = headings[index + 1]?.index ?? changelogText.length;
    if (!changelogText.slice(lineEnd + 1, sectionEnd).trim()) {
      emptySections.push(heading[0].slice(3));
    }
  }
  return emptySections;
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

async function git(cwd, arguments_) {
  const { stdout } = await execFile("git", arguments_, {
    cwd,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout.trim();
}

function toGitPath(value) {
  return value.split(path.sep).join("/");
}

async function main() {
  const [pluginRootArgument, previousTag, releaseTag] = process.argv.slice(2);
  if (
    !pluginRootArgument ||
    !previousTag ||
    !releaseTag ||
    process.argv.length !== 5
  ) {
    throw new Error(
      "Usage: node .github/scripts/backfill-plugin-changelog.mjs <plugin-root> <previous-tag> <release-tag>",
    );
  }
  const result = await backfillPluginChangelog({
    repositoryRoot: DEFAULT_ROOT,
    pluginRoot: path.resolve(process.cwd(), pluginRootArgument),
    previousTag,
    releaseTag,
  });
  console.log(
    `${result.pluginName}: generated ${result.releaseTag} from ${result.commits.length} commit(s) into ${result.changelogPath}.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
