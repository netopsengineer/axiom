import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertCanonicalPathInside } from "./marketplace-smoke-fixture.mjs";

export const TOOLING_ROOT = fileURLToPath(
  new URL("../../../", import.meta.url),
);
export const CLAUDE_PACKAGE_ROOT = path.join(
  TOOLING_ROOT,
  "node_modules/@anthropic-ai/claude-code",
);
export const CLAUDE_BIN = path.join(CLAUDE_PACKAGE_ROOT, "bin/claude.exe");
export const CLAUDE_SHIM_DIR = path.join(TOOLING_ROOT, "node_modules/.bin");

export async function assertClaudePackageContract(
  packageRoot = CLAUDE_PACKAGE_ROOT,
) {
  const packagePath = path.join(packageRoot, "package.json");
  let packageRecord;
  try {
    packageRecord = JSON.parse(await readFile(packagePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Cannot read the installed Claude package contract at ${packagePath}: ${errorMessage(error)}`,
    );
  }

  if (packageRecord.name !== "@anthropic-ai/claude-code") {
    throw new Error(
      `Installed Claude package name must be @anthropic-ai/claude-code, received ${String(packageRecord.name)}.`,
    );
  }
  if (packageRecord.bin?.claude !== "bin/claude.exe") {
    throw new Error(
      `Installed Claude package bin.claude must be bin/claude.exe, received ${String(packageRecord.bin?.claude)}.`,
    );
  }

  const binaryPath = path.resolve(packageRoot, packageRecord.bin.claude);
  try {
    await assertCanonicalPathInside(
      packageRoot,
      binaryPath,
      "installed Claude binary",
    );
    const binaryStat = await stat(binaryPath);
    if (!binaryStat.isFile()) {
      throw new Error(`not a file: ${binaryPath}`);
    }
  } catch (error) {
    throw new Error(
      `Installed Claude binary contract failed: ${errorMessage(error)}`,
    );
  }

  return binaryPath;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
