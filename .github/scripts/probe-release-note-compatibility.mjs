#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { assertReleaseNoteFixtures } from "./lib/release-note-contract.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PRESET_PACKAGE = "conventional-changelog-conventionalcommits";
const GENERATOR_PACKAGE = "@semantic-release/release-notes-generator";
const WRITER_PACKAGE = "conventional-changelog-writer";
const COMMAND_TIMEOUT_MS = 120_000;

export async function probeReleaseNoteCompatibility({
  repositoryRoot = DEFAULT_ROOT,
  fetchImpl = fetch,
  installAndCheck = installAndCheckCandidate,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const packageRecord = await readJson(path.join(root, "package.json"));
  const lockRecord = await readJson(path.join(root, "package-lock.json"));
  const currentPresetVersion = exactVersion(
    packageRecord.devDependencies?.[PRESET_PACKAGE],
    `${PRESET_PACKAGE} devDependency`,
  );
  const currentGeneratorVersion = lockedVersion(lockRecord, GENERATOR_PACKAGE);
  const currentWriterVersion = lockedVersion(lockRecord, WRITER_PACKAGE);
  const candidatePresetVersion = await fetchLatestVersion(
    PRESET_PACKAGE,
    fetchImpl,
  );

  const baseResult = {
    schemaVersion: 1,
    dependency: PRESET_PACKAGE,
    current: {
      generator: currentGeneratorVersion,
      preset: currentPresetVersion,
      writer: currentWriterVersion,
    },
    candidate: {
      generator: currentGeneratorVersion,
      preset: candidatePresetVersion,
      writer: null,
    },
    compatible: null,
    vulnerabilities: null,
    reason: null,
  };

  if (
    semverMajor(candidatePresetVersion) <= semverMajor(currentPresetVersion)
  ) {
    return { ...baseResult, status: "managed" };
  }

  const candidate = await installAndCheck({
    generatorVersion: currentGeneratorVersion,
    presetVersion: candidatePresetVersion,
    repositoryRoot: root,
  });
  return {
    ...baseResult,
    status: determineProbeStatus({
      compatible: candidate.compatible,
      currentPresetVersion,
      candidatePresetVersion,
      vulnerabilities: candidate.vulnerabilities,
    }),
    candidate: {
      generator: currentGeneratorVersion,
      preset: candidatePresetVersion,
      writer: candidate.writerVersion,
    },
    compatible: candidate.compatible,
    vulnerabilities: candidate.vulnerabilities,
    reason: candidate.reason,
  };
}

export function determineProbeStatus({
  compatible,
  currentPresetVersion,
  candidatePresetVersion,
  vulnerabilities,
}) {
  if (
    semverMajor(candidatePresetVersion) <= semverMajor(currentPresetVersion)
  ) {
    return "managed";
  }
  if (vulnerabilities > 0) {
    return "security-blocked";
  }
  return compatible ? "ready" : "held";
}

export function semverMajor(version) {
  return Number.parseInt(exactVersion(version, "version").split(".")[0], 10);
}

async function installAndCheckCandidate({
  generatorVersion,
  presetVersion,
  repositoryRoot,
}) {
  const probeRoot = await mkdtemp(
    path.join(os.tmpdir(), "axiom-release-note-probe-"),
  );
  try {
    await Promise.all([
      cp(
        path.join(repositoryRoot, "package-lock.json"),
        path.join(probeRoot, "package-lock.json"),
      ),
      mkdir(path.join(probeRoot, ".github/release-tooling"), {
        recursive: true,
      }),
    ]);
    await cp(
      path.join(
        repositoryRoot,
        ".github/release-tooling/semantic-release-npm-disabled",
      ),
      path.join(
        probeRoot,
        ".github/release-tooling/semantic-release-npm-disabled",
      ),
      { recursive: true },
    );
    const packageRecord = await readJson(
      path.join(repositoryRoot, "package.json"),
    );
    packageRecord.devDependencies[PRESET_PACKAGE] = presetVersion;
    packageRecord.devDependencies[GENERATOR_PACKAGE] = generatorVersion;
    await writeFile(
      path.join(probeRoot, "package.json"),
      `${JSON.stringify(packageRecord, null, 2)}\n`,
    );
    await execFile(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--loglevel=error",
      ],
      {
        cwd: probeRoot,
        encoding: "utf8",
        timeout: COMMAND_TIMEOUT_MS,
      },
    );

    const generatorModule = await import(
      pathToFileURL(
        path.join(
          probeRoot,
          "node_modules/@semantic-release/release-notes-generator/index.js",
        ),
      )
    );
    let compatible = true;
    let reason = null;
    try {
      await assertReleaseNoteFixtures({
        cwd: probeRoot,
        generateNotes: generatorModule.generateNotes,
      });
    } catch (error) {
      compatible = false;
      reason = firstLine(error);
    }

    const lockRecord = await readJson(
      path.join(probeRoot, "package-lock.json"),
    );
    const audit = await runAudit(probeRoot);
    const vulnerabilities = audit.metadata?.vulnerabilities?.total;
    if (!Number.isSafeInteger(vulnerabilities) || vulnerabilities < 0) {
      throw new Error(
        "Candidate npm audit output must contain a non-negative integer vulnerability total.",
      );
    }
    return {
      compatible,
      reason,
      vulnerabilities,
      writerVersion: lockedVersion(lockRecord, WRITER_PACKAGE),
    };
  } finally {
    await rm(probeRoot, { force: true, recursive: true });
  }
}

async function runAudit(cwd) {
  try {
    const result = await execFile(
      "npm",
      ["audit", "--json", "--audit-level=low"],
      {
        cwd,
        encoding: "utf8",
        timeout: COMMAND_TIMEOUT_MS,
      },
    );
    return JSON.parse(result.stdout);
  } catch (error) {
    if (typeof error.stdout === "string" && error.stdout.trim() !== "") {
      return JSON.parse(error.stdout);
    }
    throw error;
  }
}

async function fetchLatestVersion(packageName, fetchImpl) {
  const response = await fetchImpl(
    `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`,
  );
  if (!response.ok) {
    throw new Error(
      `npm registry lookup for ${packageName} failed with HTTP ${response.status}.`,
    );
  }
  const metadata = await response.json();
  return exactVersion(metadata.version, `${packageName} latest version`);
}

function lockedVersion(lockRecord, packageName) {
  return exactVersion(
    lockRecord.packages?.[`node_modules/${packageName}`]?.version,
    `${packageName} lockfile version`,
  );
}

function exactVersion(value, description) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/u.test(value)) {
    throw new Error(`${description} must be an exact stable SemVer.`);
  }
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function firstLine(error) {
  return (error instanceof Error ? error.message : String(error)).split(
    "\n",
  )[0];
}

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) {
    return { jsonOut: null };
  }
  if (argumentsList.length === 2 && argumentsList[0] === "--json-out") {
    return { jsonOut: path.resolve(argumentsList[1]) };
  }
  throw new Error(
    "Usage: node .github/scripts/probe-release-note-compatibility.mjs [--json-out <path>]",
  );
}

async function writeGithubOutputs(result) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }
  const output = [
    `status=${result.status}`,
    `current_preset=${result.current.preset}`,
    `candidate_preset=${result.candidate.preset}`,
    `generator=${result.candidate.generator}`,
    `writer=${result.candidate.writer ?? result.current.writer}`,
    `compatible=${String(result.compatible)}`,
    `vulnerabilities=${String(result.vulnerabilities)}`,
  ].join("\n");
  await writeFile(process.env.GITHUB_OUTPUT, `${output}\n`, { flag: "a" });
}

async function main() {
  const { jsonOut } = parseArguments(process.argv.slice(2));
  const result = await probeReleaseNoteCompatibility();
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (jsonOut) {
    await writeFile(jsonOut, json);
  }
  await writeGithubOutputs(result);
  process.stdout.write(json);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
