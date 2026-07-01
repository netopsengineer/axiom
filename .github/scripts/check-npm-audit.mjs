import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Advisory gate over `npm audit --json`. npm audit itself has no way to ignore
// an advisory or filter "no upstream fix" / transitive findings; this wrapper
// adds a strict allowlist with per-entry expiry so every accepted advisory is
// documented, time-bound, and re-reviewed.

const ROOT = process.cwd();
const ALLOWLIST_PATH = ".github/npm-audit-allowlist.json";
const LEVELS = ["info", "low", "moderate", "high", "critical"];
const GHSA_PATTERN = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function advisoryKey(url) {
  const value = String(url ?? "");
  const match = GHSA_PATTERN.exec(value);
  return match ? match[0].toUpperCase() : value;
}

// Case-insensitive lookup key: canonicalizes an embedded GHSA id if present,
// otherwise case-folds the whole value (e.g. a bare advisory URL) so allowlist
// entries can be written in any case.
export function normalizeAllowlistKey(key) {
  const value = String(key ?? "").trim();
  const match = GHSA_PATTERN.exec(value);
  return match ? match[0].toUpperCase() : value.toUpperCase();
}

export function loadAllowlistFromText(text, allowlistPath = ALLOWLIST_PATH) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`${allowlistPath} is not valid JSON: ${error.message}`);
  }

  if (!isPlainObject(data)) {
    throw new Error(`${allowlistPath} must contain a JSON object.`);
  }

  if (!Object.hasOwn(data, "advisories")) {
    return {};
  }

  if (!isPlainObject(data.advisories)) {
    throw new Error(`${allowlistPath} advisories must be an object.`);
  }

  const allowlist = {};
  for (const [key, record] of Object.entries(data.advisories)) {
    if (!isPlainObject(record)) {
      throw new Error(`Allowlist entry ${key} must be an object.`);
    }
    validateAllowlistRecord(key, record);
    allowlist[key] = {
      expires: record.expires,
      reason: record.reason,
    };
  }
  return allowlist;
}

export function evaluateAudit({
  audit,
  allowlist,
  threshold = "high",
  now = new Date(),
}) {
  const thresholdLevel = normalizeThreshold(threshold);
  const thresholdRank = rank(thresholdLevel);
  const nowTime = toTime(now, "now");
  const vulnerabilities = validateAuditReport(audit);
  const allowByKey = new Map(
    Object.entries(allowlist ?? {}).map(([key, record]) => [
      normalizeAllowlistKey(key),
      { key, record },
    ]),
  );

  const activeKeys = new Set();
  const relevant = new Map();

  for (const [pkg, vulnerability] of Object.entries(vulnerabilities)) {
    const via = Array.isArray(vulnerability?.via) ? vulnerability.via : [];
    for (const entry of via) {
      if (!entry || typeof entry !== "object" || !entry.url) {
        continue;
      }

      const key = advisoryKey(entry.url);
      const urlKey = normalizeAllowlistKey(entry.url);
      activeKeys.add(key);
      activeKeys.add(urlKey);

      if (rank(entry.severity) < thresholdRank) {
        continue;
      }

      if (!relevant.has(key)) {
        relevant.set(key, {
          key,
          severity: entry.severity,
          title: entry.title || "(no title)",
          url: entry.url,
          packages: new Set(),
        });
      }
      relevant.get(key).packages.add(pkg);
    }
  }

  const blocking = [];
  const allowed = [];

  for (const advisory of relevant.values()) {
    const hit =
      allowByKey.get(normalizeAllowlistKey(advisory.key)) ??
      allowByKey.get(normalizeAllowlistKey(advisory.url));

    if (!hit) {
      blocking.push({ ...advisory, reason: "not allowlisted" });
      continue;
    }

    const expiresAt = parseDateEndOfDayUtc(hit.record.expires).getTime();
    if (nowTime > expiresAt) {
      blocking.push({
        ...advisory,
        reason: `allowlist entry expired on ${hit.record.expires} - re-review and renew or remove it`,
      });
      continue;
    }

    allowed.push({
      ...advisory,
      expires: hit.record.expires,
      note: hit.record.reason,
    });
  }

  const stale = Object.keys(allowlist ?? {}).filter((key) => {
    return !activeKeys.has(normalizeAllowlistKey(key));
  });

  return {
    threshold: thresholdLevel,
    allowed,
    blocking,
    stale,
  };
}

export function normalizeThreshold(value) {
  const threshold = String(value || "high").toLowerCase();
  if (!LEVELS.includes(threshold)) {
    throw new Error(
      `AUDIT_LEVEL must be one of ${LEVELS.join(", ")}; got ${JSON.stringify(value)}.`,
    );
  }
  return threshold;
}

function validateAllowlistRecord(key, record) {
  if (
    typeof record.expires !== "string" ||
    !DATE_PATTERN.test(record.expires)
  ) {
    throw new Error(
      `Allowlist entry ${key} must include an expires date in YYYY-MM-DD format.`,
    );
  }

  parseDateEndOfDayUtc(record.expires, key);

  if (typeof record.reason !== "string" || record.reason.trim() === "") {
    throw new Error(`Allowlist entry ${key} must include a non-blank reason.`);
  }
}

function parseDateEndOfDayUtc(value, key = value) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      `Allowlist entry ${key} must include a real calendar date in YYYY-MM-DD format.`,
    );
  }
  return date;
}

function toTime(value, label) {
  const time =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(time)) {
    throw new Error(`${label} must be a valid date.`);
  }
  return time;
}

function rank(level) {
  const index = LEVELS.indexOf(String(level || "").toLowerCase());
  // Fail closed: an unrecognized severity (schema drift, a new npm audit
  // level, a malformed advisory) must not rank below every threshold and
  // silently vanish from the gate — treat it as at least as severe as the
  // highest known level so it always surfaces and must be allowlisted.
  return index === -1 ? LEVELS.length : index;
}

// Fail closed on anything that isn't a genuine audit report: `npm audit` exits
// non-zero both when it finds vulnerabilities (a real report, safe to ignore
// the exit code for) AND on operational failures (registry outage, corrupt
// lockfile, etc.), which parse as `{ "error": {...} }` with no
// `vulnerabilities` key. Treating that shape as "zero vulnerabilities" would
// turn an audit failure into a silent, false-green pass.
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
      'npm audit output is missing a "vulnerabilities" object — not a valid audit report.',
    );
  }
  return audit.vulnerabilities;
}

function summarizeAuditError(error) {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const code = error.code ? `${error.code}: ` : "";
    return `${code}${error.summary || error.message || JSON.stringify(error)}`;
  }
  return String(error);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function loadAllowlist() {
  try {
    return loadAllowlistFromText(
      readFileSync(path.join(ROOT, ALLOWLIST_PATH), "utf8"),
      ALLOWLIST_PATH,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function runAudit() {
  // npm audit exits non-zero when it finds vulnerabilities but still prints JSON,
  // so the exit code is ignored and stdout is parsed directly.
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
  if (result.allowed.length > 0) {
    console.log(
      `Allowlisted advisories (${result.allowed.length}), not blocking until expiry:`,
    );
    for (const advisory of result.allowed) {
      console.log(
        `- ${advisory.key} [${advisory.severity}] expires ${advisory.expires} - ${advisory.note}`,
      );
    }
  }

  if (result.stale.length > 0) {
    const phrase =
      result.stale.length === 1
        ? "entry no longer matches"
        : "entries no longer match";
    console.log(
      `Note: ${result.stale.length} allowlist ${phrase} a current advisory (safe to remove): ${result.stale.join(", ")}`,
    );
  }

  if (result.blocking.length > 0) {
    console.error(
      `\nnpm audit gate FAILED: ${result.blocking.length} advisor${
        result.blocking.length === 1 ? "y" : "ies"
      } at or above "${result.threshold}" not covered by a valid allowlist entry:`,
    );
    for (const advisory of result.blocking) {
      console.error(
        `- ${advisory.key} [${advisory.severity}] ${advisory.title}`,
      );
      console.error(`    ${advisory.url}`);
      console.error(`    paths: ${[...advisory.packages].join(", ")}`);
      console.error(`    ${advisory.reason}`);
    }
    console.error(
      `\nFix with "npm audit fix". If there is no upstream fix, add the advisory to ${ALLOWLIST_PATH} with an "expires" date and a reason.`,
    );
    return 1;
  }

  console.log(
    `\nnpm audit gate passed (threshold: ${result.threshold}; ${result.allowed.length} allowlisted, 0 blocking).`,
  );
  return 0;
}

function main() {
  try {
    const result = evaluateAudit({
      audit: runAudit(),
      allowlist: loadAllowlist(),
      threshold: process.env.AUDIT_LEVEL || "high",
      now: new Date(),
    });
    process.exitCode = printResult(result);
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
