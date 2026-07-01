import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyAuditFixResult,
  packageFilesChanged,
  runAuditFix,
  summarizeAudit,
} from "./run-npm-audit-fix.mjs";

// cspell:ignore ELOCKVERIFY
// Real `npm audit fix --json` nests the report under an `audit` key (verified
// against actual `npm audit fix --package-lock-only --json --dry-run` output);
// it is NOT flat like bare `npm audit --json`.
const AUDIT_JSON = JSON.stringify({
  audit: {
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 1,
        critical: 0,
      },
    },
    vulnerabilities: {
      npm: {},
    },
  },
});

test("exit code 0 with parseable output succeeds", () => {
  const classification = classifyAuditFixResult({
    status: 0,
    stdout: AUDIT_JSON,
    stderr: "",
  });

  assert.equal(classification.ok, true);
  assert.equal(classification.audit.audit.metadata.vulnerabilities.high, 1);
});

test("summarizeAudit reports counts from real npm audit fix --json shape", () => {
  assert.equal(
    summarizeAudit(JSON.parse(AUDIT_JSON)),
    "Remaining advisory counts: high: 1.",
  );
});

test("summarizeAudit reports package count when metadata counts are absent", () => {
  assert.equal(
    summarizeAudit({ audit: { vulnerabilities: { npm: {}, tar: {} } } }),
    "Remaining vulnerable package entries: 2.",
  );
});

test("summarizeAudit falls back to a generic message for an unrecognized shape", () => {
  assert.equal(summarizeAudit({}), "npm audit fix produced audit JSON.");
});

test("non-zero exit with parseable audit JSON and no operational error is non-fatal", () => {
  const classification = classifyAuditFixResult({
    status: 1,
    stdout: AUDIT_JSON,
    stderr: "",
  });

  assert.equal(classification.ok, true);
  assert.match(classification.reason, /advisories may remain/);
});

test("non-zero exit with no stdout fails", () => {
  const classification = classifyAuditFixResult({
    status: 1,
    stdout: "",
    stderr: "network failure",
  });

  assert.equal(classification.ok, false);
  assert.match(classification.reason, /without JSON output/);
});

test("non-zero exit with invalid JSON fails", () => {
  const classification = classifyAuditFixResult({
    status: 1,
    stdout: "not json",
    stderr: "",
  });

  assert.equal(classification.ok, false);
  assert.match(classification.reason, /invalid JSON/);
});

test("non-zero exit with an npm error object fails", () => {
  const classification = classifyAuditFixResult({
    status: 1,
    stdout: JSON.stringify({
      error: {
        code: "ELOCKVERIFY",
        summary: "package lock is out of date",
      },
    }),
    stderr: "",
  });

  assert.equal(classification.ok, false);
  assert.match(classification.reason, /operational error/);
});

test("changed flag logic handles unchanged package files", () => {
  const changed = packageFilesChanged({
    spawnSyncImpl: () => ({ status: 0, stderr: "" }),
  });

  assert.equal(changed, false);
});

test("changed flag logic handles changed package files", () => {
  const changed = packageFilesChanged({
    spawnSyncImpl: () => ({ status: 1, stderr: "" }),
  });

  assert.equal(changed, true);
});

test("runAuditFix writes changed=true to GITHUB_OUTPUT and logs the real summary shape", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-fix-test-"));
  const output = path.join(dir, "github-output");
  const calls = [];
  const logs = [];
  const exitCode = runAuditFix({
    env: { GITHUB_OUTPUT: output },
    log: (message) => logs.push(message),
    error: () => {},
    spawnSyncImpl: (command) => {
      calls.push(command);
      if (command === "npm") {
        return { status: 1, stdout: AUDIT_JSON, stderr: "" };
      }
      return { status: 1, stderr: "" };
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ["npm", "git"]);
  assert.equal(readFileSync(output, "utf8"), "changed=true\n");
  assert.ok(logs.includes("Remaining advisory counts: high: 1."));
});
