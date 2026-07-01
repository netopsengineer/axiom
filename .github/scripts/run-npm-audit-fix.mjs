import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const AUDIT_FIX_ARGS = [
  "audit",
  "fix",
  "--package-lock-only",
  "--json",
  "--loglevel=error",
];
const PACKAGE_FILES = ["package-lock.json", "package.json"];

export function classifyAuditFixResult(result) {
  if (result.error) {
    return {
      ok: false,
      reason: `Could not run npm audit fix: ${result.error.message}`,
    };
  }

  if (result.signal) {
    return {
      ok: false,
      reason: `npm audit fix exited because of signal ${result.signal}.`,
    };
  }

  if (result.status === 0) {
    return {
      ok: true,
      reason: "npm audit fix completed successfully.",
      audit: parseAuditJsonIfPresent(result.stdout),
    };
  }

  const stdout = String(result.stdout ?? "").trim();
  if (stdout === "") {
    return {
      ok: false,
      reason: "npm audit fix failed without JSON output.",
      detail: summarizeText(result.stderr),
    };
  }

  let audit;
  try {
    audit = JSON.parse(stdout);
  } catch (error) {
    return {
      ok: false,
      reason: `npm audit fix produced invalid JSON after a non-zero exit: ${error.message}`,
      detail: summarizeText(result.stderr),
    };
  }

  if (hasOperationalError(audit)) {
    return {
      ok: false,
      reason: `npm audit fix reported an operational error: ${summarizeOperationalError(audit.error)}`,
      audit,
    };
  }

  return {
    ok: true,
    reason:
      "npm audit fix exited non-zero but produced valid audit JSON with no operational error; advisories may remain.",
    audit,
  };
}

export function packageFilesChanged({
  cwd = ROOT,
  spawnSyncImpl = spawnSync,
} = {}) {
  const result = spawnSyncImpl(
    "git",
    ["diff", "--quiet", "--", ...PACKAGE_FILES],
    {
      cwd,
      encoding: "utf8",
    },
  );

  if (result.error) {
    throw new Error(
      `Could not inspect package file diff: ${result.error.message}`,
    );
  }
  if (result.status === 0) {
    return false;
  }
  if (result.status === 1) {
    return true;
  }

  const detail = summarizeText(result.stderr);
  throw new Error(
    `git diff --quiet exited with status ${result.status}${detail ? `: ${detail}` : ""}`,
  );
}

export function runAuditFix({
  cwd = ROOT,
  env = process.env,
  log = console.log,
  error = console.error,
  spawnSyncImpl = spawnSync,
} = {}) {
  const result = spawnSyncImpl("npm", AUDIT_FIX_ARGS, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const classification = classifyAuditFixResult(result);

  if (!classification.ok) {
    error(`npm audit fix failed: ${classification.reason}`);
    if (classification.detail) {
      error(classification.detail);
    }
    return 1;
  }

  log(classification.reason);
  if (classification.audit) {
    log(summarizeAudit(classification.audit));
  }

  let changed;
  try {
    changed = packageFilesChanged({ cwd, spawnSyncImpl });
  } catch (diffError) {
    error(diffError.message);
    return 1;
  }

  writeGithubOutput(env.GITHUB_OUTPUT, { changed: String(changed) });
  if (changed) {
    log("package-lock.json or package.json changed from npm audit fix.");
  } else {
    log("No lockfile changes from npm audit fix; nothing to do.");
  }

  return 0;
}

function parseAuditJsonIfPresent(stdout) {
  const text = String(stdout ?? "").trim();
  if (text === "") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function hasOperationalError(audit) {
  return Boolean(
    audit &&
      typeof audit === "object" &&
      Object.hasOwn(audit, "error") &&
      audit.error,
  );
}

function summarizeOperationalError(error) {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const code = error.code ? `${error.code}: ` : "";
    const summary = error.summary || error.message || JSON.stringify(error);
    return `${code}${summary}`;
  }
  return String(error);
}

export function summarizeAudit(result) {
  // `npm audit fix --json` nests the audit report under an `audit` key
  // (unlike bare `npm audit --json`, which is flat); support both shapes.
  const report = isPlainObject(result?.audit) ? result.audit : result;

  const counts = report?.metadata?.vulnerabilities;
  if (isPlainObject(counts)) {
    const summary = ["info", "low", "moderate", "high", "critical"]
      .filter((level) => Number.isInteger(counts[level]) && counts[level] > 0)
      .map((level) => `${level}: ${counts[level]}`);
    if (summary.length > 0) {
      return `Remaining advisory counts: ${summary.join(", ")}.`;
    }
  }

  const vulnerabilities = report?.vulnerabilities;
  if (isPlainObject(vulnerabilities)) {
    return `Remaining vulnerable package entries: ${Object.keys(vulnerabilities).length}.`;
  }

  return "npm audit fix produced audit JSON.";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function summarizeText(text, maxLength = 600) {
  const value = String(text ?? "").trim();
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

function writeGithubOutput(outputPath, values) {
  if (!outputPath) {
    return;
  }

  for (const [key, value] of Object.entries(values)) {
    appendFileSync(outputPath, `${key}=${value}\n`);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = runAuditFix();
}
