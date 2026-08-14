import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SKILL_PATH = path.join(
  ROOT,
  "plugins/axiom-git/skills/commit-message/SKILL.md",
);

test("commit-message always requires a separate final confirmation", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  assert.match(
    skill,
    /Only a new affirmative user response after the assembled\nmessage is shown authorizes `git commit`\./u,
  );
  assert.doesNotMatch(skill, /step 5 may be skipped/u);
});

test("protected-branch recovery preserves mixed work without stash", async () => {
  const skill = await readFile(SKILL_PATH, "utf8");
  assert.match(skill, /git switch -c <new-branch>/u);
  assert.match(skill, /Require the two hashes to match\./u);
  assert.doesNotMatch(skill, /git stash(?:\s|$)/u);

  const repository = await mkdtemp(
    path.join(os.tmpdir(), "axiom-commit-message-contract-"),
  );
  try {
    await git(repository, ["init", "--initial-branch=main"]);
    await git(repository, ["config", "user.name", "Axiom Test"]);
    await git(repository, ["config", "user.email", "axiom@example.invalid"]);
    await Promise.all([
      writeFile(path.join(repository, "staged.txt"), "base\n", "utf8"),
      writeFile(path.join(repository, "unstaged.txt"), "base\n", "utf8"),
    ]);
    await git(repository, ["add", "staged.txt", "unstaged.txt"]);
    await git(repository, ["commit", "-m", "test: seed fixture"]);

    await Promise.all([
      writeFile(path.join(repository, "staged.txt"), "staged change\n", "utf8"),
      writeFile(
        path.join(repository, "unstaged.txt"),
        "unstaged change\n",
        "utf8",
      ),
      writeFile(path.join(repository, "untracked.txt"), "untracked\n", "utf8"),
    ]);
    await git(repository, ["add", "staged.txt"]);
    const stagedHashBefore = await stagedDiffHash(repository);

    await git(repository, ["switch", "-c", "fix/cache-timeout"]);

    assert.equal(await stagedDiffHash(repository), stagedHashBefore);
    assert.equal(
      await readFile(path.join(repository, "unstaged.txt"), "utf8"),
      "unstaged change\n",
    );
    assert.equal(
      await readFile(path.join(repository, "untracked.txt"), "utf8"),
      "untracked\n",
    );
    assert.equal(
      await git(repository, ["branch", "--show-current"]),
      "fix/cache-timeout",
    );
    const status = await git(repository, ["status", "--short"]);
    assert.match(status, /^M {2}staged\.txt$/mu);
    assert.match(status, /^ M unstaged\.txt$/mu);
    assert.match(status, /^\?\? untracked\.txt$/mu);
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

async function git(cwd, arguments_, options = {}) {
  const result = await execFile("git", arguments_, {
    cwd,
    encoding: "utf8",
    ...options,
  });
  return result.stdout.trim();
}

async function stagedDiffHash(cwd) {
  const { stdout } = await execFile("git", ["diff", "--cached", "--binary"], {
    cwd,
    encoding: "buffer",
  });
  return createHash("sha256").update(stdout).digest("hex");
}
