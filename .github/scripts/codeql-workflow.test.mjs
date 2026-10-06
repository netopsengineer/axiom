import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";

const workflowText = await readFile(
  new URL("../workflows/codeql.yml", import.meta.url),
  "utf8",
);
const workflow = YAML.parse(workflowText);
const analysis = workflow.jobs.analyze;

test("CodeQL scans every pull request to main without actor or path filters", () => {
  assert.deepEqual(Object.keys(workflow.on).sort(), [
    "pull_request",
    "push",
    "schedule",
    "workflow_dispatch",
  ]);
  assert.deepEqual(workflow.on.pull_request, { branches: ["main"] });
  assert.deepEqual(workflow.on.push, { branches: ["main"] });
  assert.equal(workflow.on.workflow_dispatch, null);
  assert.equal(analysis.if, undefined);
});

test("CodeQL preserves a weekly baseline scan and all three required job names", () => {
  assert.equal(workflow.on.schedule.length, 1);
  assert.match(workflow.on.schedule[0].cron, /^\d+ \d+ \* \* [0-6]$/u);
  assert.deepEqual(Object.keys(workflow.jobs), ["analyze"]);
  assert.deepEqual(analysis.strategy.matrix, {
    language: ["actions", "javascript-typescript", "python"],
  });
  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression.
  assert.equal(analysis.name, "Analyze (${{ matrix.language }})");
  assert.deepEqual(
    analysis.strategy.matrix.language.map((language) =>
      analysis.name.replace(/\$\{\{ matrix\.language \}\}/u, language),
    ),
    [
      "Analyze (actions)",
      "Analyze (javascript-typescript)",
      "Analyze (python)",
    ],
  );
  assert.equal(analysis.strategy["fail-fast"], false);
  assert.equal(analysis["continue-on-error"], undefined);
  assert.equal(analysis["runs-on"], "ubuntu-latest");
  assert.equal(analysis["timeout-minutes"], 30);
});

test("only the analysis job can upload security results", () => {
  assert.deepEqual(workflow.permissions, {});
  assert.deepEqual(analysis.permissions, {
    contents: "read",
    "security-events": "write",
  });
  assert.equal(workflow.env, undefined);
  assert.equal(analysis.env, undefined);
  assert.equal(analysis.secrets, undefined);
});

test("CodeQL uses pinned actions without building or executing repository code", () => {
  assert.equal(analysis.steps.length, 3);
  const [checkout, initialize, analyze] = analysis.steps;
  assert.match(checkout.uses, /^actions\/checkout@[a-f0-9]{40}$/u);
  assert.deepEqual(checkout.with, { "persist-credentials": false });
  assert.match(initialize.uses, /^github\/codeql-action\/init@[a-f0-9]{40}$/u);
  assert.match(analyze.uses, /^github\/codeql-action\/analyze@[a-f0-9]{40}$/u);
  assert.equal(initialize.uses.split("@")[1], analyze.uses.split("@")[1]);
  for (const step of analysis.steps) {
    assert.equal(step.run, undefined);
    assert.equal(step.if, undefined);
    assert.equal(step.env, undefined);
    assert.equal(step["continue-on-error"], undefined);
  }
  assert.match(
    workflowText,
    /github\/codeql-action\/init@[a-f0-9]{40} # v4\.\d+\.\d+/u,
  );
  assert.match(
    workflowText,
    /github\/codeql-action\/analyze@[a-f0-9]{40} # v4\.\d+\.\d+/u,
  );
});

test("CodeQL preserves the default query suite and per-language result categories", () => {
  const [, initialize, analyze] = analysis.steps;
  assert.deepEqual(initialize.with, {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression.
    languages: "${{ matrix.language }}",
    "build-mode": "none",
  });
  assert.deepEqual(analyze.with, {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression.
    category: "/language:${{ matrix.language }}",
    "wait-for-processing": true,
  });
});
