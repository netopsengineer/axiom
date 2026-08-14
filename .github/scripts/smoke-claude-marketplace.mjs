#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  assertCanonicalPathInside,
  assertExactPluginSequence,
  assertInstalledPluginMatches,
  assertStateSnapshotUnchanged,
  cleanupOwnedTemporaryDirectory,
  collectMarketplaceFixtureFiles,
  createMarketplaceFixture,
  createOwnedTemporaryDirectory,
  snapshotClaudeRealState,
} from "./lib/marketplace-smoke-fixture.mjs";

const execFileAsync = promisify(execFile);
const TOOLING_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const COMMAND_TIMEOUT_MS = 60_000;

async function main() {
  const marketplaceRoot = parseArguments(process.argv.slice(2));
  const ownedPaths = [];
  let realStateBefore;
  let stateWasChecked = false;

  try {
    realStateBefore = await snapshotClaudeRealState();
    const selection = await collectMarketplaceFixtureFiles(marketplaceRoot);
    const fixture = await createMarketplaceFixture(selection, {
      kind: "coexistence",
    });
    const configRoot = await createOwnedTemporaryDirectory(
      "axiom-claude-coexistence-config",
    );
    ownedPaths.push(fixture.root, configRoot);
    const environment = { CLAUDE_CONFIG_DIR: configRoot };

    const versionResult = await runClaude(["--version"], environment);
    const version = versionResult.stdout.trim();
    if (version === "") {
      throw new Error("Claude CLI returned a blank version.");
    }
    await verifyCommandSurface(environment);

    await runClaude(
      ["plugin", "marketplace", "add", fixture.root, "--scope", "user"],
      environment,
    );
    const marketplaces = parseJsonResult(
      await runClaude(["plugin", "marketplace", "list", "--json"], environment),
    );
    assert.deepEqual(
      marketplaces.map(({ name }) => name),
      [selection.contract.marketplace.name],
    );
    assert.equal(
      await realpath(marketplaces[0].path),
      await realpath(fixture.root),
    );

    const pluginNames = selection.contract.plugins.map(({ name }) => name);
    const metadataByName = new Map(
      selection.contract.plugins.map(({ name, metadata }) => [name, metadata]),
    );
    for (const pluginName of pluginNames) {
      await runClaude(
        ["plugin", "install", `${pluginName}@axiom`, "--scope", "user"],
        environment,
      );
    }

    const plugins = parseJsonResult(
      await runClaude(["plugin", "list", "--json"], environment),
    );
    assertExactPluginSequence(
      plugins.map(({ id }) => id),
      pluginNames.map((pluginName) => `${pluginName}@axiom`),
      "Claude installed plugin IDs",
    );
    assert.equal(plugins.length, pluginNames.length);
    for (const plugin of plugins) {
      const pluginName = plugin.id.replace(/@axiom$/u, "");
      const metadata = metadataByName.get(pluginName);
      if (!metadata) {
        throw new Error(`Claude installed unexpected plugin ${plugin.id}.`);
      }
      assert.equal(plugin.version, metadata.version);
      assert.equal(plugin.scope, "user");
      assert.equal(plugin.enabled, true);
      await assertCanonicalPathInside(
        configRoot,
        plugin.installPath,
        `${plugin.id} installed path`,
      );
      await assertInstalledPluginMatches({
        fixtureRoot: fixture.root,
        installedRoot: plugin.installPath,
        manifestPath: ".claude-plugin/plugin.json",
        pluginName,
        selectedFiles: fixture.files,
      });
    }

    const realStateAfter = await snapshotClaudeRealState();
    assertStateSnapshotUnchanged(realStateBefore, realStateAfter, "Claude");
    stateWasChecked = true;

    for (const ownedPath of [...ownedPaths].reverse()) {
      await cleanupOwnedTemporaryDirectory(ownedPath);
    }
    ownedPaths.length = 0;
    console.log(
      `Claude marketplace smoke passed (${version}; ${pluginNames.join(", ")}; real state unchanged).`,
    );
  } catch (error) {
    let stateError;
    if (realStateBefore && !stateWasChecked) {
      try {
        const realStateAfter = await snapshotClaudeRealState();
        assertStateSnapshotUnchanged(realStateBefore, realStateAfter, "Claude");
      } catch (snapshotError) {
        stateError = snapshotError;
      }
    }

    if (process.env.AXIOM_SMOKE_CLEANUP_ON_FAILURE === "1") {
      for (const ownedPath of [...ownedPaths].reverse()) {
        await cleanupOwnedTemporaryDirectory(ownedPath).catch(() => {});
      }
    }

    const retained =
      ownedPaths.length === 0
        ? ""
        : `\nRetained temporary roots:\n${ownedPaths.map((ownedPath) => `- ${ownedPath}`).join("\n")}`;
    const stateFailure = stateError
      ? `\nReal-state verification also failed: ${errorMessage(stateError)}`
      : "";
    throw new Error(`${errorMessage(error)}${stateFailure}${retained}`);
  }
}

async function verifyCommandSurface(environment) {
  for (const argumentsList of [
    ["plugin", "marketplace", "add", "--help"],
    ["plugin", "marketplace", "list", "--help"],
    ["plugin", "install", "--help"],
    ["plugin", "list", "--help"],
  ]) {
    await runClaude(argumentsList, environment);
  }
}

async function runClaude(argumentsList, environment) {
  try {
    return await execFileAsync("claude", argumentsList, {
      cwd: TOOLING_ROOT,
      encoding: "utf8",
      env: { ...process.env, ...environment },
      maxBuffer: 16 * 1024 * 1024,
      timeout: COMMAND_TIMEOUT_MS,
    });
  } catch (error) {
    throw commandError(["claude", ...argumentsList], error);
  }
}

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) {
    return TOOLING_ROOT;
  }
  if (argumentsList.length === 2 && argumentsList[0] === "--root") {
    return path.resolve(argumentsList[1]);
  }
  throw new Error(
    "Usage: node .github/scripts/smoke-claude-marketplace.mjs [--root <root>]",
  );
}

function parseJsonResult(result) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Command returned invalid JSON: ${error.message}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

function commandError(command, error) {
  const code = error.code ?? error.signal ?? "unknown";
  return new Error(
    `Command failed: ${command.join(" ")}\nExit: ${code}\nstdout:\n${error.stdout ?? ""}\nstderr:\n${error.stderr ?? ""}`,
  );
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
