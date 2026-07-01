import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAudit, loadAllowlistFromText } from "./check-npm-audit.mjs";

// cspell:ignore vxpw ELOCKVERIFY
const GHSA = "GHSA-vxpw-j846-p89q";
const URL = `https://github.com/advisories/${GHSA}`;
const NOW = "2026-01-15T00:00:00Z";

test("valid GHSA-keyed allowlist entry passes", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "high", url: URL }),
    allowlist: allowlistWith("ghsa-vxpw-j846-p89q"),
    threshold: "high",
    now: NOW,
  });

  assert.equal(result.blocking.length, 0);
  assert.equal(result.allowed.length, 1);
  assert.deepEqual(result.stale, []);
});

test("valid URL-keyed allowlist entry passes and is not stale", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "high", url: URL }),
    allowlist: allowlistWith(URL),
    threshold: "high",
    now: NOW,
  });

  assert.equal(result.blocking.length, 0);
  assert.equal(result.allowed.length, 1);
  assert.deepEqual(result.stale, []);
});

test("URL-keyed allowlist entry matches regardless of case", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "high", url: URL }),
    allowlist: allowlistWith(URL.toUpperCase()),
    threshold: "high",
    now: NOW,
  });

  assert.equal(result.blocking.length, 0);
  assert.equal(result.allowed.length, 1);
  assert.deepEqual(result.stale, []);
});

test("missing reason fails allowlist loading", () => {
  assert.throws(
    () =>
      loadAllowlistFromText(
        JSON.stringify({
          advisories: {
            [GHSA]: { expires: "2026-12-31" },
          },
        }),
        "allowlist.json",
      ),
    /non-blank reason/,
  );
});

test("blank reason fails allowlist loading", () => {
  assert.throws(
    () => allowlistWith(GHSA, { expires: "2026-12-31", reason: "   " }),
    /non-blank reason/,
  );
});

test("missing expires fails allowlist loading", () => {
  assert.throws(
    () => allowlistWith(GHSA, { reason: "accepted risk" }),
    /expires date/,
  );
});

test("invalid date format fails allowlist loading", () => {
  assert.throws(
    () =>
      allowlistWith(GHSA, {
        expires: "2026-1-31",
        reason: "accepted risk",
      }),
    /YYYY-MM-DD/,
  );
});

test("nonexistent calendar date fails allowlist loading", () => {
  assert.throws(
    () =>
      allowlistWith(GHSA, {
        expires: "2026-02-30",
        reason: "accepted risk",
      }),
    /real calendar date/,
  );
});

test("expired entry fails when now is after expiry", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "high", url: URL }),
    allowlist: allowlistWith(GHSA, {
      expires: "2026-01-01",
      reason: "accepted risk",
    }),
    threshold: "high",
    now: "2026-01-02T00:00:00Z",
  });

  assert.equal(result.blocking.length, 1);
  assert.match(result.blocking[0].reason, /expired on 2026-01-01/);
});

test("malformed advisories root fails allowlist loading", () => {
  assert.throws(
    () =>
      loadAllowlistFromText(
        JSON.stringify({ advisories: [] }),
        "allowlist.json",
      ),
    /advisories must be an object/,
  );
});

test("invalid AUDIT_LEVEL fails evaluation", () => {
  assert.throws(
    () =>
      evaluateAudit({
        audit: auditWithAdvisory({ severity: "high", url: URL }),
        allowlist: {},
        threshold: "urgent",
        now: NOW,
      }),
    /AUDIT_LEVEL must be one of/,
  );
});

test("unknown lower-than-threshold advisory does not block", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "moderate", url: URL }),
    allowlist: {},
    threshold: "high",
    now: NOW,
  });

  assert.equal(result.blocking.length, 0);
  assert.equal(result.allowed.length, 0);
});

test("unknown at-threshold advisory blocks", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "high", url: URL }),
    allowlist: {},
    threshold: "high",
    now: NOW,
  });

  assert.equal(result.blocking.length, 1);
  assert.equal(result.blocking[0].key, GHSA.toUpperCase());
});

test("top-level npm audit operational error fails closed instead of passing empty", () => {
  assert.throws(
    () =>
      evaluateAudit({
        audit: {
          error: { code: "ELOCKVERIFY", summary: "lockfile is out of date" },
        },
        allowlist: {},
        threshold: "high",
        now: NOW,
      }),
    /operational error/,
  );
});

test("audit payload missing a vulnerabilities object fails closed", () => {
  assert.throws(
    () =>
      evaluateAudit({
        audit: { auditReportVersion: 2 },
        allowlist: {},
        threshold: "high",
        now: NOW,
      }),
    /vulnerabilities/,
  );
});

test("non-object audit payload fails closed", () => {
  assert.throws(
    () =>
      evaluateAudit({
        audit: null,
        allowlist: {},
        threshold: "high",
        now: NOW,
      }),
    /must be a JSON object/,
  );
});

test("a genuinely clean audit report (empty vulnerabilities) passes", () => {
  const result = evaluateAudit({
    audit: { auditReportVersion: 2, vulnerabilities: {}, metadata: {} },
    allowlist: {},
    threshold: "high",
    now: NOW,
  });

  assert.equal(result.blocking.length, 0);
  assert.equal(result.allowed.length, 0);
});

test("unrecognized severity blocks even at the highest threshold instead of vanishing", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "extreme", url: URL }),
    allowlist: {},
    threshold: "critical",
    now: NOW,
  });

  assert.equal(result.blocking.length, 1);
  assert.equal(result.allowed.length, 0);
});

test("missing severity blocks even at the highest threshold instead of vanishing", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: undefined, url: URL }),
    allowlist: {},
    threshold: "critical",
    now: NOW,
  });

  assert.equal(result.blocking.length, 1);
  assert.equal(result.allowed.length, 0);
});

test("unrecognized severity can still be allowlisted like any other advisory", () => {
  const result = evaluateAudit({
    audit: auditWithAdvisory({ severity: "extreme", url: URL }),
    allowlist: allowlistWith(GHSA),
    threshold: "critical",
    now: NOW,
  });

  assert.equal(result.blocking.length, 0);
  assert.equal(result.allowed.length, 1);
});

function allowlistWith(
  key,
  record = { expires: "2026-12-31", reason: "accepted risk" },
) {
  return loadAllowlistFromText(
    JSON.stringify({
      advisories: {
        [key]: record,
      },
    }),
    "allowlist.json",
  );
}

function auditWithAdvisory({ severity, url }) {
  return {
    vulnerabilities: {
      "example-package": {
        via: [
          {
            title: "Example advisory",
            severity,
            url,
          },
        ],
      },
    },
  };
}
