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

test("link-check FTP dependency rejects pathological listings promptly", async () => {
  // get-uri's latest release still requests vulnerable basic-ftp 5.x.
  // Keep the real 6.x implementation, rather than suppressing the audit:
  // https://github.com/advisories/GHSA-c475-qrg2-pj4r
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
        import assert from "node:assert/strict";
        import { createRequire } from "node:module";
        const require = createRequire(import.meta.resolve("get-uri"));
        const { Client, parseList } = require("basic-ftp");
        const valid = "-rw-r--r-- 1 owner group 42 Jan 1 2026 file.txt";
        const malformed = "-rw-r--r-- 1 " + "a ".repeat(65536) + "!";
        const files = parseList(malformed + "\\r\\n" + valid + "\\r\\n");
        assert.equal(files.length, 1);
        assert.equal(files[0].name, "file.txt");
        assert.equal(files[0].size, 42);
        const client = new Client();
        assert.equal(client.options.allowSeparateTransferHost, false);
        for (const method of ["access", "lastMod", "list", "downloadTo", "close"]) {
          assert.equal(typeof client[method], "function");
        }
        client.close();
        console.log("safe FTP parser and get-uri API contract passed");
      `,
    ],
    { cwd: path.resolve(path.dirname(SCRIPT), "../.."), timeout: 5000 },
  );
  assert.equal(
    stdout.trim(),
    "safe FTP parser and get-uri API contract passed",
  );
});
