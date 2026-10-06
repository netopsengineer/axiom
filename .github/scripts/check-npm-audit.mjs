import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();

export function evaluateAudit({
  audit,
  allowlist = { version: 1, exceptions: [] },
  lockfile,
  installedPackages,
  now = new Date(),
}) {
  const vulnerabilities = validateAuditReport(audit);
  const exceptions = validateAllowlist(allowlist, now);
  const graph = new Map();
  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const node = {
      finding: {
        packageName,
        severity: normalizeSeverity(vulnerability?.severity),
        paths: Array.isArray(vulnerability?.nodes) ? vulnerability.nodes : [],
        advisories: summarizeVia(vulnerability?.via),
        fixAvailable: vulnerability?.fixAvailable,
      },
      dependencies: [],
      exceptions: new Set(),
      blocked: !isValidFinding(packageName, vulnerability),
    };
    const via = vulnerability?.via;
    if (!Array.isArray(via) || via.length === 0) {
      node.blocked = true;
    } else {
      for (const cause of via) {
        if (
          typeof cause === "string" &&
          Object.hasOwn(vulnerabilities, cause)
        ) {
          node.dependencies.push(cause);
        } else if (isPlainObject(cause)) {
          const exception = exceptions.find((entry) =>
            acceptsAdvisory({
              entry,
              cause,
              packageName,
              vulnerability,
              lockfile,
              installedPackages,
            }),
          );
          if (exception) node.exceptions.add(exception);
          else node.blocked = true;
        } else {
          node.blocked = true;
        }
      }
    }
    graph.set(packageName, node);
  }

  // npm's peer dependencies can form cycles. Resolve reachable advisory roots
  // to a fixed point, then propagate every rejected or unresolved cause.
  propagate(graph, (node, dependency) => {
    const before = node.exceptions.size;
    for (const entry of dependency.exceptions) node.exceptions.add(entry);
    return before !== node.exceptions.size;
  });
  for (const node of graph.values()) {
    if (node.exceptions.size === 0) node.blocked = true;
  }
  propagate(graph, (node, dependency) => {
    if (!node.blocked && dependency.blocked) {
      node.blocked = true;
      return true;
    }
    return false;
  });

  const blocking = [];
  const accepted = [];
  for (const node of graph.values()) {
    if (node.blocked) blocking.push(node.finding);
    else accepted.push({ ...node.finding, exceptions: [...node.exceptions] });
  }
  const unusedExceptions = exceptions.filter(
    (entry) => !accepted.some((finding) => finding.exceptions.includes(entry)),
  );
  return { blocking, accepted, unusedExceptions };
}

function propagate(graph, update) {
  let changed;
  do {
    changed = false;
    for (const node of graph.values()) {
      for (const dependency of node.dependencies) {
        if (update(node, graph.get(dependency))) changed = true;
      }
    }
  } while (changed);
}

function validateAllowlist(allowlist, now) {
  if (
    !isPlainObject(allowlist) ||
    allowlist.version !== 1 ||
    !Array.isArray(allowlist.exceptions) ||
    Object.keys(allowlist).some(
      (key) => !["version", "exceptions"].includes(key),
    )
  ) {
    throw new Error(
      "Audit allowlist must have version 1 and an exceptions array.",
    );
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error(
      "Audit exception evaluation requires a valid current time.",
    );
  }
  const fields = [
    "advisory",
    "package",
    "version",
    "expiresAt",
    "reason",
    "upstream",
  ];
  const identities = new Set();
  for (const entry of allowlist.exceptions) {
    if (
      !isPlainObject(entry) ||
      Object.keys(entry).length !== fields.length ||
      fields.some(
        (key) => typeof entry[key] !== "string" || entry[key].trim() === "",
      )
    ) {
      throw new Error(
        "Each audit exception must have exactly advisory, package, version, expiresAt, reason, and upstream.",
      );
    }
    if (
      !/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/u.test(entry.advisory) ||
      !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/u.test(entry.package) ||
      !/^\d+\.\d+\.\d+$/u.test(entry.version)
    ) {
      throw new Error(
        "Audit exceptions require an exact GHSA, package name, and release version.",
      );
    }
    const expiry = new Date(entry.expiresAt);
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/u.test(entry.expiresAt) ||
      !Number.isFinite(expiry.getTime()) ||
      expiry.toISOString() !== entry.expiresAt
    ) {
      throw new Error(
        "Audit exception expiresAt must be an exact UTC timestamp.",
      );
    }
    if (now >= expiry)
      throw new Error(
        `Audit exception ${entry.advisory} expired at ${entry.expiresAt}.`,
      );
    const upstream = new URL(entry.upstream);
    if (
      upstream.protocol !== "https:" ||
      upstream.username ||
      upstream.password
    ) {
      throw new Error(
        "Audit exceptions require a credential-free HTTPS upstream reference.",
      );
    }
    const identity = `${entry.advisory}:${entry.package}:${entry.version}`;
    if (identities.has(identity))
      throw new Error(`Duplicate audit exception: ${identity}.`);
    identities.add(identity);
  }
  return allowlist.exceptions;
}

function isPackageName(value) {
  return (
    typeof value === "string" &&
    /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(value)
  );
}

function isValidFixMetadata(value) {
  return (
    typeof value === "boolean" ||
    (isPlainObject(value) &&
      Object.keys(value).length === 3 &&
      isPackageName(value.name) &&
      typeof value.version === "string" &&
      /^\d+\.\d+\.\d+$/u.test(value.version) &&
      typeof value.isSemVerMajor === "boolean")
  );
}

function isValidFinding(packageName, finding) {
  return (
    isPlainObject(finding) &&
    isPackageName(packageName) &&
    isValidFixMetadata(finding.fixAvailable) &&
    finding.name === packageName &&
    ["info", "low", "moderate", "high", "critical"].includes(
      finding.severity,
    ) &&
    Array.isArray(finding.nodes) &&
    finding.nodes.length > 0 &&
    finding.nodes.every((node) => isPackageNode(node, packageName))
  );
}

function hasNoCompatibleFix(fixAvailable, packageName, lockfile) {
  if (fixAvailable === false) return true;
  // npm sometimes proposes downgrading a different direct dependency by a
  // major version. Verify that exact condition against the lockfile instead
  // of treating every unrelated remediation object as an unavailable fix.
  if (
    !isPlainObject(fixAvailable) ||
    typeof fixAvailable.name !== "string" ||
    !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/u.test(fixAvailable.name) ||
    fixAvailable.name === packageName ||
    typeof fixAvailable.version !== "string" ||
    !/^\d+\.\d+\.\d+$/u.test(fixAvailable.version) ||
    fixAvailable.isSemVerMajor !== true ||
    Object.keys(fixAvailable).some(
      (key) => !["name", "version", "isSemVerMajor"].includes(key),
    )
  )
    return false;
  const root = lockfile?.packages?.[""];
  const direct =
    root?.dependencies?.[fixAvailable.name] ??
    root?.devDependencies?.[fixAvailable.name];
  const current =
    lockfile?.packages?.[`node_modules/${fixAvailable.name}`]?.version;
  return (
    typeof direct === "string" &&
    typeof current === "string" &&
    /^\d+\.\d+\.\d+$/u.test(current) &&
    Number(fixAvailable.version.split(".")[0]) < Number(current.split(".")[0])
  );
}

function acceptsAdvisory({
  entry,
  cause,
  packageName,
  vulnerability,
  lockfile,
  installedPackages,
}) {
  if (
    entry.package !== packageName ||
    !Number.isSafeInteger(cause.source) ||
    cause.source <= 0 ||
    typeof cause.title !== "string" ||
    cause.title.trim() === "" ||
    typeof cause.range !== "string" ||
    cause.range.trim() === "" ||
    !["info", "low", "moderate", "high", "critical"].includes(cause.severity) ||
    vulnerability.name !== packageName ||
    cause.name !== packageName ||
    cause.dependency !== packageName ||
    cause.url !== `https://github.com/advisories/${entry.advisory}` ||
    !hasNoCompatibleFix(vulnerability.fixAvailable, packageName, lockfile)
  )
    return false;
  if (
    !Array.isArray(vulnerability.nodes) ||
    vulnerability.nodes.length === 0 ||
    !isPlainObject(lockfile?.packages) ||
    !isPlainObject(installedPackages)
  )
    return false;
  return vulnerability.nodes.every((node) => {
    if (!isPackageNode(node, packageName)) return false;
    const locked = lockfile.packages[node];
    const installed = installedPackages[node];
    return (
      isPlainObject(locked) &&
      locked.version === entry.version &&
      isPlainObject(installed) &&
      installed.name === packageName &&
      installed.version === entry.version
    );
  });
}

function isPackageNode(node, packageName) {
  if (typeof node !== "string" || !isPackageName(packageName)) return false;
  const segments = node.split("/");
  let lastPackage;
  for (let index = 0; index < segments.length; ) {
    if (segments[index++] !== "node_modules") return false;
    let name = segments[index++];
    if (!name) return false;
    if (name.startsWith("@")) {
      const scopedName = segments[index++];
      if (!scopedName) return false;
      name += `/${scopedName}`;
    }
    if (!isPackageName(name)) return false;
    lastPackage = name;
  }
  return lastPackage === packageName;
}

function readInstalledPackages(audit, allowlist) {
  const installed = {};
  const root = realpathSync(ROOT);
  for (const entry of allowlist.exceptions) {
    const finding = audit.vulnerabilities?.[entry.package];
    if (!Array.isArray(finding?.nodes)) continue;
    for (const node of finding.nodes) {
      if (!isPackageNode(node, entry.package)) continue;
      const manifest = realpathSync(path.join(root, node, "package.json"));
      const relative = path.relative(root, manifest);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(
          `Installed package manifest escapes the repository: ${node}.`,
        );
      }
      installed[node] = JSON.parse(readFileSync(manifest, "utf8"));
    }
  }
  return installed;
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

  if (audit.auditReportVersion !== 2) {
    throw new Error("Unsupported npm auditReportVersion; expected version 2.");
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
  if (result.signal || ![0, 1].includes(result.status)) {
    throw new Error(
      `npm audit did not complete normally: ${result.signal ?? result.status}.`,
    );
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

export function printResult(result) {
  for (const entry of result.unusedExceptions) {
    console.log(
      `UNUSED EXCEPTION: ${entry.advisory} ${entry.package}@${entry.version}; review or remove it. It granted no acceptance.`,
    );
  }
  const acceptedExceptions = new Set(
    result.accepted.flatMap((finding) => finding.exceptions),
  );
  for (const entry of acceptedExceptions) {
    console.log(
      `ACCEPTED TEMPORARY RISK: ${entry.advisory} ${entry.package}@${entry.version}; expires ${entry.expiresAt} (exclusive).`,
    );
    console.log(`  Reason: ${entry.reason}`);
    console.log(`  Upstream: ${entry.upstream}`);
    const rootFinding = result.accepted.find(
      (finding) => finding.packageName === entry.package,
    );
    if (isPlainObject(rootFinding?.fixAvailable)) {
      console.log(
        `  npm remediation: breaking downgrade of ${rootFinding.fixAvailable.name} to ${rootFinding.fixAvailable.version}; not a published fix for ${entry.package}.`,
      );
    }
    console.log(
      `  Affected findings: ${result.accepted
        .filter((finding) => finding.exceptions.includes(entry))
        .map((finding) => finding.packageName)
        .join(", ")}`,
    );
  }
  if (result.blocking.length === 0) {
    console.log(
      result.accepted.length === 0
        ? "npm audit gate passed (0 vulnerabilities across every severity)."
        : `npm audit gate passed with ${result.accepted.length} temporarily accepted vulnerable package entries; 0 unaccepted findings. The vulnerability is not fixed.`,
    );
    return 0;
  }

  const packageEntry = result.blocking.length === 1 ? "entry" : "entries";
  console.error(
    `npm audit gate FAILED: ${result.blocking.length} vulnerable package ${packageEntry}. Every unaccepted advisory at every severity blocks; exceptions require an exact package/version, no compatible package fix, and a valid expiry.`,
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
    const audit = runAudit();
    const allowlist = JSON.parse(
      readFileSync(path.join(ROOT, ".github/npm-audit-allowlist.json"), "utf8"),
    );
    validateAllowlist(allowlist, new Date());
    const lockfile = JSON.parse(
      readFileSync(path.join(ROOT, "package-lock.json"), "utf8"),
    );
    const installedPackages = readInstalledPackages(audit, allowlist);
    process.exitCode = printResult(
      evaluateAudit({ audit, allowlist, lockfile, installedPackages }),
    );
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
