import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { loadMarketplaceContract } from "./marketplace-contract.mjs";

const execFileAsync = promisify(execFile);
const ownedTemporaryPaths = new Set();

export async function createOwnedTemporaryDirectory(prefix) {
  if (!/^[a-z0-9-]+$/u.test(prefix)) {
    throw new Error(`Unsafe temporary directory prefix: ${prefix}`);
  }

  const temporaryRoot = await realpath(os.tmpdir());
  const createdPath = await mkdtemp(path.join(temporaryRoot, `${prefix}-`));
  const resolvedPath = await realpath(createdPath);
  assertInside(temporaryRoot, resolvedPath, "temporary directory");
  ownedTemporaryPaths.add(resolvedPath);
  return resolvedPath;
}

export async function cleanupOwnedTemporaryDirectory(temporaryPath) {
  const resolvedPath = await realpath(path.resolve(temporaryPath));
  const temporaryRoot = await realpath(os.tmpdir());
  assertInside(temporaryRoot, resolvedPath, "cleanup target");
  if (!ownedTemporaryPaths.has(resolvedPath)) {
    throw new Error(`Refusing cleanup of unowned path: ${resolvedPath}`);
  }

  await rm(resolvedPath, { force: true, recursive: true });
  ownedTemporaryPaths.delete(resolvedPath);
}

export async function collectMarketplaceFixtureFiles(sourceRoot) {
  const root = path.resolve(sourceRoot);
  const rootRealPath = await realpath(root);
  const contract = await loadMarketplaceContract(root);
  const selectedPaths = [
    ".axiom",
    ".agents/plugins/marketplace.json",
    ".claude-plugin/marketplace.json",
    ...contract.plugins.map(({ name }) => `plugins/${name}`),
  ];
  const { stdout } = await execFileAsync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...selectedPaths,
    ],
    {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 16 * 1024 * 1024,
      timeout: 30_000,
    },
  );

  const candidates = stdout.toString("utf8").split("\0").filter(Boolean).sort();
  const registeredNames = new Set(contract.plugins.map(({ name }) => name));
  const requiredFiles = new Set([
    ".axiom/marketplace.json",
    ".agents/plugins/marketplace.json",
    ".claude-plugin/marketplace.json",
  ]);

  for (const plugin of contract.plugins) {
    requiredFiles.add(`plugins/${plugin.name}/.axiom/plugin.json`);
    requiredFiles.add(`plugins/${plugin.name}/.claude-plugin/plugin.json`);
    requiredFiles.add(`plugins/${plugin.name}/.codex-plugin/plugin.json`);
  }

  for (const relativePath of candidates) {
    validateFixtureRelativePath(relativePath);
    if (!isSelectedRoot(relativePath, registeredNames)) {
      throw new Error(
        `Fixture candidate is outside selected roots: ${relativePath}`,
      );
    }

    const pluginMatch = relativePath.match(/^plugins\/([^/]+)\//u);
    if (pluginMatch && !registeredNames.has(pluginMatch[1])) {
      throw new Error(
        `Fixture contains unexpected plugin directory plugins/${pluginMatch[1]}.`,
      );
    }

    const sourcePath = path.resolve(root, relativePath);
    assertInside(root, sourcePath, relativePath);
    const sourceStats = await lstat(sourcePath);
    if (sourceStats.isDirectory()) {
      throw new Error(`git ls-files returned a directory: ${relativePath}`);
    }

    if (sourceStats.isSymbolicLink()) {
      const resolvedSourcePath = await realpath(sourcePath);
      const expectedContainer = pluginMatch
        ? path.join(rootRealPath, "plugins", pluginMatch[1])
        : rootRealPath;
      assertInside(expectedContainer, resolvedSourcePath, relativePath);
      const targetStats = await stat(sourcePath);
      if (!targetStats.isFile()) {
        throw new Error(
          `Fixture symlink must resolve to a file: ${relativePath}`,
        );
      }
    } else if (!sourceStats.isFile()) {
      throw new Error(`Fixture candidate must be a file: ${relativePath}`);
    }
  }

  for (const requiredFile of requiredFiles) {
    if (!candidates.includes(requiredFile)) {
      throw new Error(`Fixture is missing required file ${requiredFile}.`);
    }
  }

  for (const plugin of contract.plugins) {
    const skillPrefix = `plugins/${plugin.name}/skills/`;
    if (!candidates.some((candidate) => candidate.startsWith(skillPrefix))) {
      throw new Error(`Fixture is missing skills for plugins/${plugin.name}.`);
    }
  }

  return { contract, files: candidates, sourceRoot: root };
}

export async function createMarketplaceFixture(
  selection,
  { kind = "coexistence" } = {},
) {
  if (kind !== "coexistence" && kind !== "native-only") {
    throw new Error(`Unknown marketplace fixture kind: ${kind}`);
  }

  const fixtureRoot = await createOwnedTemporaryDirectory(
    `axiom-${kind}-marketplace`,
  );
  const files = selection.files.filter(
    (relativePath) =>
      kind !== "native-only" ||
      relativePath !== ".claude-plugin/marketplace.json",
  );

  try {
    for (const relativePath of files) {
      validateFixtureRelativePath(relativePath);
      const sourcePath = path.resolve(selection.sourceRoot, relativePath);
      const destinationPath = path.resolve(fixtureRoot, relativePath);
      assertInside(selection.sourceRoot, sourcePath, relativePath);
      assertInside(fixtureRoot, destinationPath, relativePath);

      const sourceStats = await stat(sourcePath);
      if (!sourceStats.isFile()) {
        throw new Error(`Fixture source must be a file: ${relativePath}`);
      }
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await copyFile(sourcePath, destinationPath);
      await chmod(destinationPath, sourceStats.mode & 0o777);
    }
  } catch (error) {
    await cleanupOwnedTemporaryDirectory(fixtureRoot);
    throw error;
  }

  return { files, kind, root: fixtureRoot };
}

export async function snapshotCodexRealState({
  configRoot = process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
  homeDirectory = os.homedir(),
} = {}) {
  return snapshotAllowlistedState([
    path.join(configRoot, "config.toml"),
    path.join(configRoot, "plugins"),
    path.join(homeDirectory, ".agents/plugins/marketplace.json"),
  ]);
}

export async function snapshotClaudeRealState({
  configRoot = process.env.CLAUDE_CONFIG_DIR ||
    path.join(os.homedir(), ".claude"),
} = {}) {
  return snapshotAllowlistedState([
    path.join(configRoot, "settings.json"),
    path.join(configRoot, "settings.local.json"),
    path.join(configRoot, "plugins"),
  ]);
}

export function assertStateSnapshotUnchanged(before, after, hostName) {
  if (before.length !== after.length) {
    throw new Error(
      `${hostName} real state inventory changed during smoke test.`,
    );
  }
  for (let index = 0; index < before.length; index += 1) {
    const beforeEntry = before[index];
    const afterEntry = after[index];
    if (
      beforeEntry.path !== afterEntry.path ||
      beforeEntry.kind !== afterEntry.kind ||
      beforeEntry.digest !== afterEntry.digest
    ) {
      throw new Error(`${hostName} real state changed during smoke test.`);
    }
  }
}

export function assertExactPluginSequence(actual, expected, description) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    throw new Error(`${description} must compare two plugin arrays.`);
  }
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${description} must exactly equal ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`,
    );
  }
}

export async function assertInstalledPluginMatches({
  fixtureRoot,
  installedRoot,
  manifestPath,
  pluginName,
  selectedFiles,
}) {
  const pluginPrefix = `plugins/${pluginName}/`;
  const skillPrefix = `${pluginPrefix}skills/`;
  const expectedPaths = selectedFiles.filter(
    (relativePath) =>
      relativePath === `${pluginPrefix}${manifestPath}` ||
      relativePath.startsWith(skillPrefix),
  );
  if (!expectedPaths.includes(`${pluginPrefix}${manifestPath}`)) {
    throw new Error(
      `Fixture selection omitted ${pluginPrefix}${manifestPath}.`,
    );
  }
  if (
    !expectedPaths.some((relativePath) => relativePath.endsWith("/SKILL.md"))
  ) {
    throw new Error(`Fixture selection omitted skills for ${pluginName}.`);
  }

  for (const sourceRelativePath of expectedPaths) {
    const installedRelativePath = sourceRelativePath.slice(pluginPrefix.length);
    const sourcePath = path.resolve(fixtureRoot, sourceRelativePath);
    const installedPath = path.resolve(installedRoot, installedRelativePath);
    assertInside(fixtureRoot, sourcePath, sourceRelativePath);
    assertInside(installedRoot, installedPath, installedRelativePath);
    const [sourceBytes, installedBytes] = await Promise.all([
      readFile(sourcePath),
      readFile(installedPath).catch((error) => {
        throw new Error(
          `Installed ${pluginName} is missing ${installedRelativePath}: ${error.message}`,
        );
      }),
    ]);
    if (!sourceBytes.equals(installedBytes)) {
      throw new Error(
        `Installed ${pluginName} differs from fixture at ${installedRelativePath}.`,
      );
    }
  }

  return expectedPaths.length;
}

export async function assertCanonicalPathInside(
  parentPath,
  candidatePath,
  description,
) {
  const [parentRealPath, candidateRealPath] = await Promise.all([
    realpath(parentPath),
    realpath(candidatePath),
  ]);
  assertInside(parentRealPath, candidateRealPath, description);
  return candidateRealPath;
}

async function snapshotAllowlistedState(allowlistedPaths) {
  const result = [];
  for (const allowlistedPath of allowlistedPaths) {
    await snapshotPath(path.resolve(allowlistedPath), result);
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

async function snapshotPath(targetPath, result) {
  const targetStats = await lstat(targetPath).catch((error) => {
    if (error.code === "ENOENT") {
      result.push({ digest: "", kind: "absent", path: targetPath });
      return null;
    }
    throw error;
  });
  if (targetStats === null) {
    return;
  }

  if (targetStats.isSymbolicLink()) {
    const target = await readlink(targetPath);
    result.push({
      digest: createHash("sha256").update(target).digest("hex"),
      kind: "symlink",
      path: targetPath,
    });
    return;
  }

  if (targetStats.isFile()) {
    const content = await readFile(targetPath);
    result.push({
      digest: createHash("sha256").update(content).digest("hex"),
      kind: "file",
      path: targetPath,
    });
    return;
  }

  if (!targetStats.isDirectory()) {
    throw new Error(`Unsupported state snapshot entry: ${targetPath}`);
  }

  result.push({ digest: "", kind: "directory", path: targetPath });
  const children = await readdir(targetPath);
  children.sort();
  for (const child of children) {
    await snapshotPath(path.join(targetPath, child), result);
  }
}

function isSelectedRoot(relativePath, registeredNames) {
  if (
    relativePath === ".axiom/marketplace.json" ||
    relativePath === ".agents/plugins/marketplace.json" ||
    relativePath === ".claude-plugin/marketplace.json"
  ) {
    return true;
  }

  const pluginMatch = relativePath.match(/^plugins\/([^/]+)\//u);
  return pluginMatch !== null && registeredNames.has(pluginMatch[1]);
}

export function validateFixtureRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath === "" ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\\")
  ) {
    throw new Error(`Unsafe fixture path: ${relativePath}`);
  }

  const normalized = path.posix.normalize(relativePath);
  if (
    normalized !== relativePath ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`Fixture path escapes its root: ${relativePath}`);
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
