import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAudit } from "./check-npm-audit.mjs";

// cspell:ignore ELOCKVERIFY

test("a clean audit report passes", () => {
  const result = evaluateAudit({ audit: auditReport({}) });
  assert.deepEqual(result.blocking, []);
});

test("every severity blocks without an allowlist", () => {
  for (const severity of ["info", "low", "moderate", "high", "critical"]) {
    const result = evaluateAudit({
      audit: auditReport({
        sample: vulnerability({ severity }),
      }),
    });
    assert.equal(result.blocking.length, 1);
    assert.equal(result.blocking[0].severity, severity);
  }
});

test("string and advisory-object causes remain visible", () => {
  const result = evaluateAudit({
    audit: auditReport({
      parent: vulnerability({ severity: "high", via: ["child"] }),
      child: vulnerability({
        severity: "high",
        via: [
          {
            source: 1234,
            title: "Example advisory",
            url: "https://example.invalid/advisory",
          },
        ],
      }),
    }),
  });

  assert.deepEqual(result.blocking[0].advisories, ["child"]);
  assert.match(result.blocking[1].advisories[0], /Example advisory/u);
  assert.match(result.blocking[1].advisories[0], /example\.invalid/u);
});

test("top-level npm audit operational errors fail closed", () => {
  assert.throws(
    () =>
      evaluateAudit({
        audit: {
          error: { code: "ELOCKVERIFY", summary: "lockfile is out of date" },
        },
      }),
    /operational error/u,
  );
});

test("missing vulnerabilities fail closed", () => {
  assert.throws(
    () => evaluateAudit({ audit: { auditReportVersion: 2 } }),
    /vulnerabilities/u,
  );
});

test("missing metadata totals fail closed", () => {
  assert.throws(
    () =>
      evaluateAudit({
        audit: { auditReportVersion: 2, vulnerabilities: {} },
      }),
    /metadata\.vulnerabilities\.total/u,
  );
});

test("inconsistent metadata totals fail closed", () => {
  assert.throws(
    () =>
      evaluateAudit({
        audit: {
          auditReportVersion: 2,
          vulnerabilities: {},
          metadata: { vulnerabilities: { total: 1 } },
        },
      }),
    /count mismatch/u,
  );
});

function auditReport(vulnerabilities) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: { total: Object.keys(vulnerabilities).length },
    },
  };
}

function vulnerability({ severity, via = [] }) {
  return {
    name: "sample",
    severity,
    via,
    nodes: ["node_modules/sample"],
  };
}
