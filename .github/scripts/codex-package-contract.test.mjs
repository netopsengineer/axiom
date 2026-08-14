import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createOwnedTemporaryDirectory } from "./lib/marketplace-smoke-fixture.mjs";
import { assertCodexPackageContract } from "./smoke-codex-marketplace.mjs";

test("Codex package contract accepts the pinned CLI layout", async (context) => {
  const packageRoot = await createPackageFixture(context);
  await assertCodexPackageContract(packageRoot);
});

test("Codex dependency bump fixture rejects an incompatible binary mapping", async (context) => {
  const packageRoot = await createPackageFixture(context, {
    codex: "dist/codex.js",
  });
  await assert.rejects(
    assertCodexPackageContract(packageRoot),
    /bin\.codex must be bin\/codex\.js/u,
  );
});

test("Codex package contract rejects a missing binary", async (context) => {
  const packageRoot = await createPackageFixture(context, undefined, false);
  await assert.rejects(
    assertCodexPackageContract(packageRoot),
    /Installed Codex binary/u,
  );
});

async function createPackageFixture(
  context,
  bin = { codex: "bin/codex.js" },
  includeBinary = true,
) {
  const packageRoot = await createOwnedTemporaryDirectory(
    "axiom-codex-package-contract",
  );
  context.after(() => rm(packageRoot, { recursive: true, force: true }));
  await mkdir(path.join(packageRoot, "bin"), { recursive: true });
  await writeFile(
    path.join(packageRoot, "package.json"),
    `${JSON.stringify({ name: "@openai/codex", bin }, null, 2)}\n`,
  );
  if (includeBinary) {
    await writeFile(
      path.join(packageRoot, "bin/codex.js"),
      "#!/usr/bin/env node\n",
    );
  }
  return packageRoot;
}
