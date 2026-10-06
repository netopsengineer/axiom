import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAudit, printResult } from "./check-npm-audit.mjs";

// cspell:ignore ELOCKVERIFY notnode

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

const ADVISORY = "GHSA-vfj7-8cjw-p6xm";
const EXPIRY = "2026-10-21T00:00:00.000Z";

function exceptionFixture() {
  return {
    audit: auditReport({
      braces: {
        name: "braces",
        severity: "high",
        fixAvailable: false,
        nodes: ["node_modules/braces"],
        via: [
          {
            source: 1240992,
            name: "braces",
            dependency: "braces",
            title: "Stack exhaustion",
            severity: "high",
            range: "<=3.0.3",
            url: `https://github.com/advisories/${ADVISORY}`,
          },
        ],
      },
    }),
    allowlist: {
      version: 1,
      exceptions: [
        {
          advisory: ADVISORY,
          package: "braces",
          version: "3.0.3",
          expiresAt: EXPIRY,
          reason:
            "Temporary accepted development tooling denial-of-service risk.",
          upstream: "https://github.com/micromatch/braces/issues/70",
        },
      ],
    },
    lockfile: { packages: { "node_modules/braces": { version: "3.0.3" } } },
    installedPackages: {
      "node_modules/braces": { name: "braces", version: "3.0.3" },
    },
    now: new Date("2026-10-06T16:00:00.000Z"),
  };
}

function addFinding(fixture, name, via) {
  fixture.audit.vulnerabilities[name] = {
    name,
    severity: "high",
    nodes: [`node_modules/${name}`],
    via,
    fixAvailable: false,
  };
  fixture.audit.metadata.vulnerabilities.total = Object.keys(
    fixture.audit.vulnerabilities,
  ).length;
}

test("exact unexpired exception visibly accepts only the verified installed version", () => {
  const result = evaluateAudit(exceptionFixture());
  assert.deepEqual(result.blocking, []);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0].exceptions[0].advisory, ADVISORY);
  assert.equal(result.accepted[0].exceptions[0].expiresAt, EXPIRY);
});

test("exception accepts the entire final UTC day but expires at the next midnight", () => {
  const fixture = exceptionFixture();
  fixture.now = new Date("2026-10-20T23:59:59.999Z");
  assert.equal(evaluateAudit(fixture).accepted.length, 1);
  for (const now of [EXPIRY, "2026-10-22T00:00:00.000Z"]) {
    fixture.now = new Date(now);
    assert.throws(() => evaluateAudit(fixture), /expired/u);
  }
});

test("missing, malformed, wildcard, duplicate, and invalid-date exceptions fail closed", () => {
  const mutations = [
    (f) => {
      f.allowlist = null;
    },
    (f) => {
      f.allowlist.version = 2;
    },
    (f) => {
      f.allowlist.extra = true;
    },
    (f) => {
      delete f.allowlist.exceptions[0].reason;
    },
    (f) => {
      f.allowlist.exceptions[0].reason = " ";
    },
    (f) => {
      f.allowlist.exceptions[0].version = "^3.0.3";
    },
    (f) => {
      f.allowlist.exceptions[0].package = "*";
    },
    (f) => {
      f.allowlist.exceptions[0].advisory = "GHSA-*";
    },
    (f) => {
      f.allowlist.exceptions[0].expiresAt = "2026-02-30T00:00:00.000Z";
    },
    (f) => {
      f.allowlist.exceptions[0].upstream = "http://example.invalid";
    },
    (f) => {
      f.allowlist.exceptions[0].upstream =
        "https://user:secret@example.invalid";
    },
    (f) => {
      f.allowlist.exceptions.push({ ...f.allowlist.exceptions[0] });
    },
    (f) => {
      f.now = new Date("invalid");
    },
  ];
  for (const mutate of mutations) {
    const fixture = exceptionFixture();
    mutate(fixture);
    assert.throws(() => evaluateAudit(fixture));
  }
});

test("wrong advisory, package, installed version, or lock version never inherits acceptance", () => {
  const mutations = [
    (f) => {
      f.allowlist.exceptions[0].advisory = "GHSA-aaaa-bbbb-cccc";
    },
    (f) => {
      f.allowlist.exceptions[0].package = "other";
    },
    (f) => {
      f.audit.vulnerabilities.braces.name = "other";
    },
    (f) => {
      f.audit.vulnerabilities.braces.via[0].name = "other";
    },
    (f) => {
      f.audit.vulnerabilities.braces.via[0].dependency = "other";
    },
    (f) => {
      f.installedPackages["node_modules/braces"].version = "3.0.4";
    },
    (f) => {
      f.installedPackages["node_modules/braces"].name = "other";
    },
    (f) => {
      f.lockfile.packages["node_modules/braces"].version = "3.0.2";
    },
    (f) => {
      delete f.installedPackages;
    },
    (f) => {
      delete f.lockfile;
    },
    (f) => {
      f.audit.vulnerabilities.braces.nodes = [];
    },
    (f) => {
      f.audit.vulnerabilities.braces.nodes.push(
        "node_modules/parent/node_modules/braces",
      );
    },
    (f) => {
      f.audit.vulnerabilities.braces.nodes = [
        "node_modules/../node_modules/braces",
      ];
    },
  ];
  for (const mutate of mutations) {
    const fixture = exceptionFixture();
    mutate(fixture);
    assert.equal(evaluateAudit(fixture).blocking.length, 1);
  }
});

test("available compatible or package-specific fixes invalidate the exception", () => {
  for (const fixAvailable of [
    true,
    undefined,
    null,
    "false",
    {},
    { name: "braces", version: "3.0.4", isSemVerMajor: false },
    { name: "braces", version: "4.0.0", isSemVerMajor: true },
    { name: "parent", version: "1.0.1", isSemVerMajor: false },
    { name: "parent", version: "2.0.0", isSemVerMajor: "true" },
  ]) {
    const fixture = exceptionFixture();
    fixture.audit.vulnerabilities.braces.fixAvailable = fixAvailable;
    assert.equal(evaluateAudit(fixture).blocking.length, 1);
  }
});

test("npm's unrelated breaking root downgrade does not pretend braces has a patched release", () => {
  const fixture = exceptionFixture();
  fixture.audit.vulnerabilities.braces.fixAvailable = {
    name: "@semantic-release/changelog",
    version: "5.0.1",
    isSemVerMajor: true,
  };
  assert.equal(evaluateAudit(fixture).accepted.length, 0);
  fixture.lockfile.packages[""] = {
    devDependencies: { "@semantic-release/changelog": "^7.0.0" },
  };
  fixture.lockfile.packages["node_modules/@semantic-release/changelog"] = {
    version: "7.0.0",
  };
  assert.equal(evaluateAudit(fixture).accepted.length, 1);
  fixture.lockfile.packages[
    "node_modules/@semantic-release/changelog"
  ].version = "4.0.0";
  assert.equal(evaluateAudit(fixture).accepted.length, 0);
});

test("all dependent findings are accepted only when every cause reaches an accepted advisory", () => {
  const fixture = exceptionFixture();
  addFinding(fixture, "micromatch", ["braces"]);
  addFinding(fixture, "semantic-release", ["micromatch", "analyzer"]);
  addFinding(fixture, "analyzer", ["semantic-release", "micromatch"]);
  const result = evaluateAudit(fixture);
  assert.deepEqual(result.blocking, []);
  assert.equal(result.accepted.length, 4);
});

test("a second advisory on the accepted package blocks it and every dependent", () => {
  const fixture = exceptionFixture();
  fixture.audit.vulnerabilities.braces.via.push({
    name: "braces",
    dependency: "braces",
    url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
  });
  addFinding(fixture, "parent", ["braces"]);
  assert.equal(evaluateAudit(fixture).blocking.length, 2);
});

test("mixed independent causes stay blocked at every severity", () => {
  for (const severity of ["info", "low", "moderate", "high", "critical"]) {
    const fixture = exceptionFixture();
    addFinding(fixture, "other", [
      {
        name: "other",
        dependency: "other",
        url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
      },
    ]);
    fixture.audit.vulnerabilities.other.severity = severity;
    addFinding(fixture, "parent", ["braces", "other"]);
    const result = evaluateAudit(fixture);
    assert.deepEqual(
      result.blocking.map(({ packageName }) => packageName),
      ["other", "parent"],
    );
    assert.equal(result.accepted.length, 1);
  }
});

test("unresolved, malformed, empty, and cyclic causes without advisory roots fail closed", () => {
  for (const via of [
    ["missing"],
    [],
    [null],
    [42],
    ["parent"],
    ["braces", "missing"],
  ]) {
    const fixture = exceptionFixture();
    addFinding(fixture, "parent", via);
    assert.deepEqual(
      evaluateAudit(fixture).blocking.map(({ packageName }) => packageName),
      ["parent"],
    );
  }
  const fixture = exceptionFixture();
  addFinding(fixture, "cycle", ["cycle"]);
  addFinding(fixture, "parent", ["braces", "cycle"]);
  assert.equal(evaluateAudit(fixture).blocking.length, 2);
});

test("malformed dependent metadata cannot be hidden by an accepted cause", () => {
  const mutations = [
    (v) => {
      v.name = "wrong";
    },
    (v) => {
      v.severity = "unknown";
    },
    (v) => {
      v.nodes = [];
    },
    (v) => {
      v.nodes = ["/outside/node_modules/parent"];
    },
  ];
  for (const mutate of mutations) {
    const fixture = exceptionFixture();
    addFinding(fixture, "parent", ["braces"]);
    mutate(fixture.audit.vulnerabilities.parent);
    assert.equal(evaluateAudit(fixture).blocking.length, 1);
  }
});

test("a stale exception never makes an unrelated clean report claim accepted findings", () => {
  const fixture = exceptionFixture();
  fixture.audit = auditReport({});
  const result = evaluateAudit(fixture);
  assert.deepEqual(result.accepted, []);
  assert.deepEqual(result.blocking, []);
  assert.equal(result.unusedExceptions.length, 1);
  assert.equal(result.unusedExceptions[0].advisory, ADVISORY);
});

test("unsupported or missing audit report versions fail closed", () => {
  for (const auditReportVersion of [undefined, 1, 3, "2"]) {
    const audit = auditReport({});
    audit.auditReportVersion = auditReportVersion;
    assert.throws(() => evaluateAudit({ audit }), /auditReportVersion/u);
  }
});

test("malformed advisory metadata never inherits the approved GHSA identity", () => {
  const mutations = [
    (cause) => {
      cause.source = {};
    },
    (cause) => {
      cause.source = 0;
    },
    (cause) => {
      delete cause.source;
    },
    (cause) => {
      cause.title = " ";
    },
    (cause) => {
      cause.severity = "unknown";
    },
    (cause) => {
      delete cause.severity;
    },
    (cause) => {
      cause.range = null;
    },
    (cause) => {
      cause.range = "";
    },
  ];
  for (const mutate of mutations) {
    const fixture = exceptionFixture();
    mutate(fixture.audit.vulnerabilities.braces.via[0]);
    addFinding(fixture, "parent", ["braces"]);
    assert.equal(evaluateAudit(fixture).blocking.length, 2);
  }
});

test("malformed fix metadata and non-package paths stay blocked for dependents", () => {
  for (const [name, nodes, fixAvailable] of [
    ["parent", ["node_modules/parent"], { unexpected: true }],
    ["foo/bar", ["node_modules/foo/bar"], false],
    ["parent", ["node_modules/notnode_modules/parent"], false],
    ["parent", ["node_modules/@scope/node_modules/parent"], false],
    ["parent", ["node_modules/../node_modules/parent"], false],
  ]) {
    const fixture = exceptionFixture();
    addFinding(fixture, name, ["braces"]);
    Object.assign(fixture.audit.vulnerabilities[name], { nodes, fixAvailable });
    assert.equal(evaluateAudit(fixture).blocking.length, 1);
  }
});

test("valid nested and scoped package paths preserve cause propagation", () => {
  const fixture = exceptionFixture();
  addFinding(fixture, "@scope/parent", ["braces"]);
  fixture.audit.vulnerabilities["@scope/parent"].nodes = [
    "node_modules/root/node_modules/@scope/parent",
  ];
  assert.equal(evaluateAudit(fixture).accepted.length, 2);
});

test("accepted output explicitly reports risk and expiry without claiming the vulnerability fixed", (t) => {
  const output = [];
  t.mock.method(console, "log", (...parts) => output.push(parts.join(" ")));
  assert.equal(printResult(evaluateAudit(exceptionFixture())), 0);
  assert.match(output.join("\n"), /ACCEPTED TEMPORARY RISK/u);
  assert.match(output.join("\n"), /expires 2026-10-21T00:00:00.000Z/u);
  assert.match(output.join("\n"), /vulnerability is not fixed/u);
  assert.doesNotMatch(output.join("\n"), /0 vulnerabilities/u);
});
