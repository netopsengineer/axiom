#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLAUDE_MARKETPLACE_PATH,
  CODEX_MARKETPLACE_PATH,
  compareGeneratedOutputs,
  loadMarketplaceContract,
  renderMarketplaceOutputs,
  validateCanonicalPlugin,
  writeOutputTransaction,
} from "./lib/marketplace-contract.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export async function preparePluginRelease({
  repositoryRoot,
  pluginRoot,
  nextVersion,
  commitFailureAt = -1,
}) {
  const root = path.resolve(repositoryRoot);
  const requestedPluginRoot = path.resolve(pluginRoot);
  const requestedPluginRealPath = await realpath(requestedPluginRoot).catch(
    (error) => {
      throw new Error(
        `Release target ${requestedPluginRoot} must exist: ${error.message}`,
      );
    },
  );
  const pluginsRoot = path.join(root, "plugins");
  const pluginsRootRealPath = await realpath(pluginsRoot);
  assertInside(pluginsRootRealPath, requestedPluginRealPath, "release target");

  const contract = await loadMarketplaceContract(root);
  const selectedPlugin = contract.plugins.find(
    ({ root: registeredRoot }) =>
      path.resolve(registeredRoot) === requestedPluginRoot,
  );
  if (!selectedPlugin) {
    throw new Error(
      `Release target ${requestedPluginRoot} must be exactly one registered plugin directory under ${pluginsRoot}.`,
    );
  }
  const registeredPluginRealPath = await realpath(selectedPlugin.root);
  if (registeredPluginRealPath !== requestedPluginRealPath) {
    throw new Error(
      `Release target ${requestedPluginRoot} must not alias another plugin directory.`,
    );
  }

  const currentOutputs = renderMarketplaceOutputs(contract);
  const staleBefore = await compareGeneratedOutputs(root, currentOutputs);
  if (staleBefore.length > 0) {
    throw new Error(
      `Release preparation requires current generated artifacts: ${staleBefore.join(", ")}.`,
    );
  }

  const canonicalRelativePath = selectedPlugin.canonicalPath;
  const canonicalAbsolutePath = path.join(root, canonicalRelativePath);
  const currentCanonicalText = await readFile(canonicalAbsolutePath, "utf8");
  const normalizedCurrentCanonicalText = `${JSON.stringify(selectedPlugin.metadata, null, 2)}\n`;
  if (currentCanonicalText !== normalizedCurrentCanonicalText) {
    throw new Error(
      `${canonicalRelativePath} must use canonical two-space JSON before release preparation.`,
    );
  }
  const nextMetadata = structuredClone(selectedPlugin.metadata);
  nextMetadata.version = nextVersion;
  validateCanonicalPlugin(
    nextMetadata,
    selectedPlugin.name,
    canonicalRelativePath,
  );
  const nextCanonicalText = `${JSON.stringify(nextMetadata, null, 2)}\n`;

  const nextContract = {
    ...contract,
    plugins: contract.plugins.map((plugin) =>
      plugin.name === selectedPlugin.name
        ? { ...plugin, metadata: nextMetadata }
        : plugin,
    ),
  };
  const nextOutputs = renderMarketplaceOutputs(nextContract);
  assertReleaseScope({
    contract,
    currentOutputs,
    nextOutputs,
    selectedPluginName: selectedPlugin.name,
  });

  const claudeManifestPath = `plugins/${selectedPlugin.name}/.claude-plugin/plugin.json`;
  const codexManifestPath = `plugins/${selectedPlugin.name}/.codex-plugin/plugin.json`;
  const transactionOutputs = new Map([
    [canonicalRelativePath, nextCanonicalText],
    [claudeManifestPath, nextOutputs.get(claudeManifestPath)],
    [codexManifestPath, nextOutputs.get(codexManifestPath)],
  ]);
  const changedPaths = await writeOutputTransaction(root, transactionOutputs, {
    commitFailureAt,
  });

  const expectedChangedPaths = [...transactionOutputs.keys()].sort();
  if (
    currentCanonicalText !== nextCanonicalText &&
    JSON.stringify(changedPaths) !== JSON.stringify(expectedChangedPaths)
  ) {
    throw new Error(
      `Release transaction changed an unexpected file set: ${changedPaths.join(", ")}.`,
    );
  }

  const verifiedContract = await loadMarketplaceContract(root);
  const verifiedOutputs = renderMarketplaceOutputs(verifiedContract);
  const staleAfter = await compareGeneratedOutputs(root, verifiedOutputs);
  if (staleAfter.length > 0) {
    throw new Error(
      `Release preparation postcondition failed for: ${staleAfter.join(", ")}.`,
    );
  }

  return {
    changedPaths,
    pluginName: selectedPlugin.name,
    previousVersion: selectedPlugin.metadata.version,
    version: nextVersion,
  };
}

export function assertReleaseScope({
  contract,
  currentOutputs,
  nextOutputs,
  selectedPluginName,
}) {
  for (const catalogPath of [CLAUDE_MARKETPLACE_PATH, CODEX_MARKETPLACE_PATH]) {
    if (currentOutputs.get(catalogPath) !== nextOutputs.get(catalogPath)) {
      throw new Error(
        `Version-only release must not change root catalog ${catalogPath}.`,
      );
    }
  }

  const allowedManifestPaths = new Set([
    `plugins/${selectedPluginName}/.claude-plugin/plugin.json`,
    `plugins/${selectedPluginName}/.codex-plugin/plugin.json`,
  ]);
  for (const plugin of contract.plugins) {
    for (const manifestPath of [
      `plugins/${plugin.name}/.claude-plugin/plugin.json`,
      `plugins/${plugin.name}/.codex-plugin/plugin.json`,
    ]) {
      const changed =
        currentOutputs.get(manifestPath) !== nextOutputs.get(manifestPath);
      if (changed !== allowedManifestPaths.has(manifestPath)) {
        throw new Error(
          `Version-only release scope assertion failed for ${manifestPath}.`,
        );
      }
    }
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

async function main() {
  const [pluginRootArgument, nextVersion] = process.argv.slice(2);
  if (!pluginRootArgument || !nextVersion || process.argv.length !== 4) {
    throw new Error(
      "Usage: node .github/scripts/prepare-plugin-release.mjs <plugin-root> <next-version>",
    );
  }
  const result = await preparePluginRelease({
    repositoryRoot: DEFAULT_ROOT,
    pluginRoot: path.resolve(process.cwd(), pluginRootArgument),
    nextVersion,
  });
  console.log(
    `${result.pluginName}: ${result.previousVersion} -> ${result.version}; updated ${result.changedPaths.join(", ") || "no files"}.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
