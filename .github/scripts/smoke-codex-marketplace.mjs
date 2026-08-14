#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, realpath, stat } from "node:fs/promises";
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
  snapshotCodexRealState,
} from "./lib/marketplace-smoke-fixture.mjs";

const execFileAsync = promisify(execFile);
const TOOLING_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CODEX_PACKAGE_ROOT = path.join(
  TOOLING_ROOT,
  "node_modules/@openai/codex",
);
const CODEX_BIN = path.join(CODEX_PACKAGE_ROOT, "bin/codex.js");
const COMMAND_TIMEOUT_MS = 60_000;

async function main() {
  const marketplaceRoot = parseArguments(process.argv.slice(2));
  const ownedPaths = [];
  let realStateBefore;
  let stateWasChecked = false;

  try {
    await assertCodexPackageContract();
    realStateBefore = await snapshotCodexRealState();
    const selection = await collectMarketplaceFixtureFiles(marketplaceRoot);
    const coexistence = await createMarketplaceFixture(selection, {
      kind: "coexistence",
    });
    const nativeOnly = await createMarketplaceFixture(selection, {
      kind: "native-only",
    });
    ownedPaths.push(coexistence.root, nativeOnly.root);

    const versionResult = await runCodex(["--version"], {});
    const version = versionResult.stdout.trim();
    if (version === "") {
      throw new Error("Codex CLI returned a blank version.");
    }
    await verifyCommandSurface();

    const passResults = [];
    for (const fixture of [coexistence, nativeOnly]) {
      const configRoot = await createOwnedTemporaryDirectory(
        `axiom-codex-${fixture.kind}-config`,
      );
      ownedPaths.push(configRoot);
      const codexHome = path.join(configRoot, "codex-home");
      await mkdir(codexHome, { recursive: true });
      passResults.push(
        await runMarketplacePass({
          codexHome,
          configRoot,
          fixture,
          selection,
        }),
      );
    }

    const realStateAfter = await snapshotCodexRealState();
    assertStateSnapshotUnchanged(realStateBefore, realStateAfter, "Codex");
    stateWasChecked = true;

    for (const ownedPath of [...ownedPaths].reverse()) {
      await cleanupOwnedTemporaryDirectory(ownedPath);
    }
    ownedPaths.length = 0;

    const passSummary = passResults
      .map(({ kind, versionBehavior }) => `${kind} versions ${versionBehavior}`)
      .join("; ");
    console.log(
      `Codex marketplace smoke passed (${version}; ${passSummary}; real state unchanged).`,
    );
  } catch (error) {
    let stateError;
    if (realStateBefore && !stateWasChecked) {
      try {
        const realStateAfter = await snapshotCodexRealState();
        assertStateSnapshotUnchanged(realStateBefore, realStateAfter, "Codex");
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

export async function assertCodexPackageContract(
  packageRoot = CODEX_PACKAGE_ROOT,
) {
  const packagePath = path.join(packageRoot, "package.json");
  let packageRecord;
  try {
    packageRecord = JSON.parse(await readFile(packagePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Cannot read the installed Codex package contract at ${packagePath}: ${errorMessage(error)}`,
    );
  }

  if (packageRecord.name !== "@openai/codex") {
    throw new Error(
      `Installed Codex package name must be @openai/codex, received ${String(packageRecord.name)}.`,
    );
  }
  if (packageRecord.bin?.codex !== "bin/codex.js") {
    throw new Error(
      `Installed Codex package bin.codex must be bin/codex.js, received ${String(packageRecord.bin?.codex)}.`,
    );
  }

  const binaryPath = path.resolve(packageRoot, packageRecord.bin.codex);
  try {
    await assertCanonicalPathInside(
      packageRoot,
      binaryPath,
      "installed Codex binary",
    );
    const binaryStat = await stat(binaryPath);
    if (!binaryStat.isFile()) {
      throw new Error(`not a file: ${binaryPath}`);
    }
  } catch (error) {
    throw new Error(
      `Installed Codex binary contract failed: ${errorMessage(error)}`,
    );
  }
}

async function verifyCommandSurface() {
  for (const argumentsList of [
    ["plugin", "marketplace", "add", "--help"],
    ["plugin", "marketplace", "list", "--help"],
    ["plugin", "add", "--help"],
    ["plugin", "list", "--help"],
  ]) {
    await runCodex(argumentsList, {});
  }
}

async function runMarketplacePass({
  codexHome,
  configRoot,
  fixture,
  selection,
}) {
  const environment = { CODEX_HOME: codexHome };
  const pluginNames = selection.contract.plugins.map(({ name }) => name);
  const metadataByName = new Map(
    selection.contract.plugins.map(({ name, metadata }) => [name, metadata]),
  );

  const addMarketplace = parseJsonResult(
    await runCodex(
      ["plugin", "marketplace", "add", fixture.root, "--json"],
      environment,
    ),
  );
  assert.equal(addMarketplace.marketplaceName, "axiom");
  assert.equal(addMarketplace.alreadyAdded, false);
  assert.equal(
    await realpath(addMarketplace.installedRoot),
    await realpath(fixture.root),
  );

  const marketplaces = parseJsonResult(
    await runCodex(["plugin", "marketplace", "list", "--json"], environment),
  );
  assert.deepEqual(
    marketplaces.marketplaces.map(({ name }) => name),
    ["axiom"],
  );
  assert.equal(
    await realpath(marketplaces.marketplaces[0].root),
    await realpath(fixture.root),
  );

  const available = parseJsonResult(
    await runCodex(
      ["plugin", "list", "--available", "--marketplace", "axiom", "--json"],
      environment,
    ),
  );
  assert.deepEqual(available.installed, []);
  assertExactPluginSequence(
    available.available.map(({ name }) => name),
    pluginNames,
    "Codex discovered plugin names",
  );
  assert.equal(available.available.length, pluginNames.length);

  const observedVersions = new Set();
  for (const entry of available.available) {
    const metadata = metadataByName.get(entry.name);
    assert.equal(entry.pluginId, `${entry.name}@axiom`);
    assert.equal(entry.marketplaceName, "axiom");
    assert.equal(entry.installed, false);
    assert.equal(entry.enabled, false);
    assert.equal(
      entry.installPolicy,
      metadata.platforms.codex.policy.installation,
    );
    assert.equal(
      entry.authPolicy,
      metadata.platforms.codex.policy.authentication,
    );
    assertAcceptedVersion(entry.version, metadata.version, entry.name);
    observedVersions.add(entry.version === "local" ? "local" : "canonical");
  }

  const installedPaths = new Map();
  for (const pluginName of pluginNames) {
    const metadata = metadataByName.get(pluginName);
    const installed = parseJsonResult(
      await runCodex(
        ["plugin", "add", `${pluginName}@axiom`, "--json"],
        environment,
      ),
    );
    assert.equal(installed.pluginId, `${pluginName}@axiom`);
    assert.equal(installed.name, pluginName);
    assert.equal(installed.marketplaceName, "axiom");
    assertAcceptedVersion(installed.version, metadata.version, pluginName);
    observedVersions.add(installed.version === "local" ? "local" : "canonical");
    await assertCanonicalPathInside(
      configRoot,
      installed.installedPath,
      `${pluginName} installed path`,
    );
    installedPaths.set(pluginName, installed.installedPath);
  }

  const pluginList = parseJsonResult(
    await runCodex(["plugin", "list", "--json"], environment),
  );
  assertExactPluginSequence(
    pluginList.installed.map(({ name }) => name),
    pluginNames,
    "Codex installed plugin names",
  );
  assert.equal(pluginList.installed.length, pluginNames.length);
  assert.deepEqual(pluginList.available, []);
  for (const entry of pluginList.installed) {
    const metadata = metadataByName.get(entry.name);
    assert.equal(entry.pluginId, `${entry.name}@axiom`);
    assert.equal(entry.marketplaceName, "axiom");
    assert.equal(entry.installed, true);
    assert.equal(entry.enabled, true);
    assertAcceptedVersion(entry.version, metadata.version, entry.name);
    observedVersions.add(entry.version === "local" ? "local" : "canonical");
    await assertInstalledPluginMatches({
      fixtureRoot: fixture.root,
      installedRoot: installedPaths.get(entry.name),
      manifestPath: ".codex-plugin/plugin.json",
      pluginName: entry.name,
      selectedFiles: fixture.files,
    });
  }

  return {
    kind: fixture.kind,
    versionBehavior: [...observedVersions].sort().join("+") || "unreported",
  };
}

function assertAcceptedVersion(actual, canonical, pluginName) {
  if (actual !== canonical && actual !== "local") {
    throw new Error(
      `${pluginName} version must be canonical ${canonical} or local, received ${actual}.`,
    );
  }
}

async function runCodex(argumentsList, environment) {
  try {
    return await execFileAsync(
      process.execPath,
      [CODEX_BIN, ...argumentsList],
      {
        cwd: TOOLING_ROOT,
        encoding: "utf8",
        env: { ...process.env, ...environment },
        maxBuffer: 16 * 1024 * 1024,
        timeout: COMMAND_TIMEOUT_MS,
      },
    );
  } catch (error) {
    throw commandError([process.execPath, CODEX_BIN, ...argumentsList], error);
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
    "Usage: node .github/scripts/smoke-codex-marketplace.mjs [--root <root>]",
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

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (scriptPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
