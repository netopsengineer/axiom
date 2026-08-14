import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCRIPT = fileURLToPath(
  new URL("./check-markdown-links.mjs", import.meta.url),
);

test("tracked Markdown deletions are not passed to the link checker", async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "axiom-links-"));
  try {
    await execFileAsync("git", ["init", "--quiet"], { cwd: fixture });
    const deletedFile = path.join(fixture, "PLAN.md");
    await writeFile(deletedFile, "# Finished plan\n", "utf8");
    await execFileAsync("git", ["add", "PLAN.md"], { cwd: fixture });
    await unlink(deletedFile);

    const { stdout } = await execFileAsync(process.execPath, [SCRIPT], {
      cwd: fixture,
    });
    assert.equal(
      stdout.trim(),
      "No Markdown files selected for link checking.",
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
