import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Advisory gate over `npm audit --json`. npm audit itself has no way to ignore
// an advisory or filter "no upstream fix" / transitive findings — its only knobs
// are --audit-level (severity) and --omit (dependency type). This wrapper adds an
// allowlist with per-entry expiry so the scheduled audit fails only on advisories
// that are (a) at or above the threshold AND (b) not covered by a current
// allowlist entry. Advisories with a real fix should be resolved by `npm audit
// fix` (see dependency-audit-fix.yml); only genuinely unfixable ones (e.g. bundled
// inside npm) belong in the allowlist, and every entry expires so it is re-reviewed.

const ROOT = process.cwd();
const ALLOWLIST_PATH = ".github/npm-audit-allowlist.json";
const LEVELS = ["info", "low", "moderate", "high", "critical"];
const THRESHOLD = (process.env.AUDIT_LEVEL || "high").toLowerCase();

function rank(level) {
  const index = LEVELS.indexOf(level);
  return index === -1 ? 0 : index;
}

function fail(message) {
  console.error(`npm audit gate error: ${message}`);
  process.exit(1);
}

function loadAllowlist() {
  let text;
  try {
    text = readFileSync(path.join(ROOT, ALLOWLIST_PATH), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    return fail(`Could not read ${ALLOWLIST_PATH}: ${error.message}`);
  }
  try {
    const data = JSON.parse(text);
    const advisories = data?.advisories;
    return advisories &&
      typeof advisories === "object" &&
      !Array.isArray(advisories)
      ? advisories
      : {};
  } catch (error) {
    return fail(`${ALLOWLIST_PATH} is not valid JSON: ${error.message}`);
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
    return fail(`Could not run npm audit: ${result.error.message}`);
  }
  if (!result.stdout || result.stdout.trim() === "") {
    const detail = result.stderr ? ` ${result.stderr.trim()}` : "";
    return fail(`npm audit produced no JSON output.${detail}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return fail(`Could not parse npm audit --json output: ${error.message}`);
  }
}

function advisoryKey(url) {
  // Preserve GitHub's canonical lowercase GHSA casing; matching is done
  // case-insensitively so allowlist entries can be written in either case.
  const match = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i.exec(url || "");
  return match ? match[0] : url;
}

function main() {
  const threshold = rank(THRESHOLD);
  const allowlist = loadAllowlist();
  // Case-insensitive lookup: allowlist keys mapped to upper case.
  const allowByKey = new Map(
    Object.entries(allowlist).map(([key, record]) => [
      key.toUpperCase(),
      { key, record },
    ]),
  );
  const audit = runAudit();
  const vulnerabilities = audit.vulnerabilities ?? {};

  // Collect every advisory key seen at any severity (for stale-entry detection)
  // and the unique advisories at or above the threshold (the ones the gate cares
  // about). An advisory can surface under several packages/paths, so dedupe by key.
  const allKeys = new Set();
  const relevant = new Map();

  for (const [pkg, vuln] of Object.entries(vulnerabilities)) {
    const via = Array.isArray(vuln?.via) ? vuln.via : [];
    for (const entry of via) {
      if (!entry || typeof entry !== "object" || !entry.url) {
        continue;
      }
      const key = advisoryKey(entry.url);
      allKeys.add(key);
      if (rank(entry.severity) < threshold) {
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

  for (const adv of relevant.values()) {
    const hit =
      allowByKey.get(String(adv.key).toUpperCase()) ||
      allowByKey.get(String(adv.url).toUpperCase());
    const record = hit ? hit.record : null;

    if (record == null) {
      blocking.push({ ...adv, reason: "not allowlisted" });
      continue;
    }

    const expires = typeof record === "object" ? record.expires : null;
    const expiresAt = expires ? Date.parse(`${expires}T23:59:59Z`) : Number.NaN;
    if (Number.isNaN(expiresAt)) {
      blocking.push({
        ...adv,
        reason: `allowlist entry is missing a valid "expires" date (YYYY-MM-DD)`,
      });
      continue;
    }
    if (Date.now() > expiresAt) {
      blocking.push({
        ...adv,
        reason: `allowlist entry expired on ${expires} — re-review and renew or remove it`,
      });
      continue;
    }
    allowed.push({
      ...adv,
      expires,
      note: typeof record === "object" ? record.reason : String(record),
    });
  }

  if (allowed.length > 0) {
    console.log(
      `Allowlisted advisories (${allowed.length}), not blocking until expiry:`,
    );
    for (const adv of allowed) {
      console.log(
        `- ${adv.key} [${adv.severity}] expires ${adv.expires} — ${adv.note || "no reason given"}`,
      );
    }
  }

  const allKeysUpper = new Set(
    [...allKeys].map((key) => String(key).toUpperCase()),
  );
  const staleKeys = Object.keys(allowlist).filter(
    (key) => !allKeysUpper.has(key.toUpperCase()),
  );
  if (staleKeys.length > 0) {
    const phrase =
      staleKeys.length === 1
        ? "entry no longer matches"
        : "entries no longer match";
    console.log(
      `Note: ${staleKeys.length} allowlist ${phrase} a current advisory (safe to remove): ${staleKeys.join(", ")}`,
    );
  }

  if (blocking.length > 0) {
    console.error(
      `\nnpm audit gate FAILED: ${blocking.length} advisor${
        blocking.length === 1 ? "y" : "ies"
      } at or above "${THRESHOLD}" not covered by a valid allowlist entry:`,
    );
    for (const adv of blocking) {
      console.error(`- ${adv.key} [${adv.severity}] ${adv.title}`);
      console.error(`    ${adv.url}`);
      console.error(`    paths: ${[...adv.packages].join(", ")}`);
      console.error(`    ${adv.reason}`);
    }
    console.error(
      `\nFix with "npm audit fix". If there is no upstream fix, add the advisory to ${ALLOWLIST_PATH} with an "expires" date and a reason.`,
    );
    process.exit(1);
  }

  console.log(
    `\nnpm audit gate passed (threshold: ${THRESHOLD}; ${allowed.length} allowlisted, 0 blocking).`,
  );
}

main();
