import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DISABLED_NPM_PUBLISHER =
  "file:.github/release-tooling/semantic-release-npm-disabled";

test("semantic-release uses the fail-closed local npm publisher", async () => {
  const packageRecord = await readJson("package.json");
  assert.equal(
    packageRecord.devDependencies["@semantic-release/npm"],
    DISABLED_NPM_PUBLISHER,
  );
  assert.equal(
    packageRecord.overrides["semantic-release"]["@semantic-release/npm"],
    "$@semantic-release/npm",
  );

  const disabledPublisher = await import(
    pathToFileURL(
      path.join(
        ROOT,
        ".github/release-tooling/semantic-release-npm-disabled/index.js",
      ),
    )
  );
  for (const hook of ["verifyConditions", "prepare", "publish", "addChannel"]) {
    await assert.rejects(
      disabledPublisher[hook](),
      /npm publication is disabled in axiom/u,
    );
  }
});

test("every shipped plugin has an explicit non-npm release pipeline", async () => {
  for (const plugin of ["axiom-git", "axiom-versioning"]) {
    const moduleUrl = pathToFileURL(
      path.join(ROOT, "plugins", plugin, "release.config.js"),
    );
    const configuration = (await import(moduleUrl)).default;
    assert.ok(Array.isArray(configuration.plugins));
    assert.ok(configuration.plugins.length > 0);
    assert.equal(
      configuration.plugins.some((entry) =>
        Array.isArray(entry)
          ? entry[0] === "@semantic-release/npm"
          : entry === "@semantic-release/npm",
      ),
      false,
    );
  }
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}
