import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();

export function evaluateAudit({ audit }) {
  const vulnerabilities = validateAuditReport(audit);
  const blocking = Object.entries(vulnerabilities).map(
    ([packageName, vulnerability]) => ({
      packageName,
      severity: normalizeSeverity(vulnerability?.severity),
      paths: Array.isArray(vulnerability?.nodes) ? vulnerability.nodes : [],
      advisories: summarizeVia(vulnerability?.via),
    }),
  );

  return { blocking };
}

function validateAuditReport(audit) {
  if (!isPlainObject(audit)) {
    throw new Error("npm audit output must be a JSON object.");
  }
  if (audit.error) {
    throw new Error(
      `npm audit reported an operational error instead of a report: ${summarizeAuditError(audit.error)}`,
    );
  }
  if (!isPlainObject(audit.vulnerabilities)) {
    throw new Error(
      'npm audit output is missing a "vulnerabilities" object; this is not a valid audit report.',
    );
  }

  const reportedTotal = audit.metadata?.vulnerabilities?.total;
  if (!Number.isInteger(reportedTotal) || reportedTotal < 0) {
    throw new Error(
      "npm audit output is missing a valid metadata.vulnerabilities.total value.",
    );
  }
  const actualTotal = Object.keys(audit.vulnerabilities).length;
  if (reportedTotal !== actualTotal) {
    throw new Error(
      `npm audit vulnerability count mismatch: metadata reports ${reportedTotal}, but ${actualTotal} package entries were returned.`,
    );
  }

  return audit.vulnerabilities;
}

function normalizeSeverity(value) {
  const severity = String(value ?? "unknown")
    .trim()
    .toLowerCase();
  return severity || "unknown";
}

function summarizeVia(via) {
  if (!Array.isArray(via)) {
    return [];
  }
  return via.map((entry) => {
    if (typeof entry === "string") {
      return entry;
    }
    if (isPlainObject(entry)) {
      return [entry.source, entry.title, entry.url]
        .filter((part) => part !== undefined && part !== null && part !== "")
        .join(" | ");
    }
    return String(entry);
  });
}

function summarizeAuditError(error) {
  if (typeof error === "string") {
    return error;
  }
  if (isPlainObject(error)) {
    const code = error.code ? `${error.code}: ` : "";
    return `${code}${error.summary || error.message || JSON.stringify(error)}`;
  }
  return String(error);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function runAudit() {
  const result = spawnSync("npm", ["audit", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`Could not run npm audit: ${result.error.message}`);
  }
  if (!result.stdout || result.stdout.trim() === "") {
    const detail = result.stderr ? ` ${result.stderr.trim()}` : "";
    throw new Error(`npm audit produced no JSON output.${detail}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Could not parse npm audit --json output: ${error.message}`,
    );
  }
}

function printResult(result) {
  if (result.blocking.length === 0) {
    console.log(
      "npm audit gate passed (0 vulnerabilities across every severity).",
    );
    return 0;
  }

  const packageEntry = result.blocking.length === 1 ? "entry" : "entries";
  console.error(
    `npm audit gate FAILED: ${result.blocking.length} vulnerable package ${packageEntry}. This gate does not permit thresholds, allowlists, or deferred findings.`,
  );
  for (const finding of result.blocking) {
    console.error(`- ${finding.packageName} [${finding.severity}]`);
    for (const advisory of finding.advisories) {
      console.error(`    ${advisory}`);
    }
    if (finding.paths.length > 0) {
      console.error(`    paths: ${finding.paths.join(", ")}`);
    }
  }
  console.error(
    '\nFix the dependency graph and rerun "npm run audit:ci". Do not suppress the finding.',
  );
  return 1;
}

function main() {
  try {
    process.exitCode = printResult(evaluateAudit({ audit: runAudit() }));
  } catch (error) {
    console.error(`npm audit gate error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
