import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  assertClaudePackageContract,
  CLAUDE_BIN,
} from "./lib/claude-package-contract.mjs";
import { createOwnedTemporaryDirectory } from "./lib/marketplace-smoke-fixture.mjs";

test("Claude package contract accepts the pinned CLI layout", async (context) => {
  const packageRoot = await createPackageFixture(context);
  await assertClaudePackageContract(packageRoot);
});

test("Claude dependency bump fixture rejects an incompatible binary mapping", async (context) => {
  const packageRoot = await createPackageFixture(context, {
    claude: "dist/claude.js",
  });
  await assert.rejects(
    assertClaudePackageContract(packageRoot),
    /bin\.claude must be bin\/claude\.exe/u,
  );
});

test("Claude package contract rejects a missing binary", async (context) => {
  const packageRoot = await createPackageFixture(context, undefined, false);
  await assert.rejects(
    assertClaudePackageContract(packageRoot),
    /Installed Claude binary/u,
  );
});

test("the installed exact Claude CLI satisfies its package contract", async () => {
  assert.equal(await assertClaudePackageContract(), CLAUDE_BIN);
});

async function createPackageFixture(
  context,
  bin = { claude: "bin/claude.exe" },
  includeBinary = true,
) {
  const packageRoot = await createOwnedTemporaryDirectory(
    "axiom-claude-package-contract",
  );
  context.after(() => rm(packageRoot, { recursive: true, force: true }));
  await mkdir(path.join(packageRoot, "bin"), { recursive: true });
  await writeFile(
    path.join(packageRoot, "package.json"),
    `${JSON.stringify({ name: "@anthropic-ai/claude-code", bin }, null, 2)}\n`,
  );
  if (includeBinary) {
    await writeFile(path.join(packageRoot, "bin/claude.exe"), "fixture\n");
  }
  return packageRoot;
}
