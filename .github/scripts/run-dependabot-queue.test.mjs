import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import YAML from "yaml";
import {
  isEligiblePullRequest,
  runDependabotQueue,
} from "./run-dependabot-queue.mjs";

const repository = "owner/repository";
const sha = "a".repeat(40);
const endpoint = `repos/${repository}/pulls`;

function pullRequest(number = 1, overrides = {}) {
  return {
    number,
    state: "open",
    draft: false,
    user: { login: "dependabot[bot]", type: "Bot" },
    head: {
      ref: "dependabot/npm_and_yarn/tooling",
      sha,
      repo: { full_name: repository },
    },
    base: { ref: "main", repo: { full_name: repository } },
    mergeable: true,
    mergeable_state: "behind",
    ...overrides,
  };
}

function listCommand() {
  return [
    "api",
    "--paginate",
    `${endpoint}?state=open&per_page=100`,
    "--jq",
    '.[] | select(.user.login == "dependabot[bot]" and .user.type == "Bot") | .number',
  ];
}

function readCommand(number = 1) {
  return ["api", `${endpoint}/${number}`];
}

function mergeCommand(number = 1, head = sha) {
  return [
    "pr",
    "merge",
    String(number),
    "--repo",
    repository,
    "--auto",
    "--squash",
    "--match-head-commit",
    head,
  ];
}

function updateCommand(number = 1, head = sha) {
  return [
    "api",
    "--method",
    "PUT",
    `${endpoint}/${number}/update-branch`,
    "--raw-field",
    `expected_head_sha=${head}`,
  ];
}

function fixture(responses) {
  const commands = [];
  const logs = [];
  const gh = (args) => {
    commands.push(args);
    assert.ok(responses.length > 0, `Unexpected command: ${args.join(" ")}`);
    const response = responses.shift();
    if (response instanceof Error) throw response;
    if (args.includes("--paginate")) {
      if (typeof response === "string") return response;
      // Simulate the CLI's paginated numeric projection, not raw PR bodies.
      return response
        .flat()
        .filter(
          (pr) =>
            pr.user?.login === "dependabot[bot]" && pr.user?.type === "Bot",
        )
        .map((pr) => String(pr.number))
        .join("\n");
    }
    return JSON.stringify(response);
  };
  const run = () => {
    const result = runDependabotQueue({
      repository,
      gh,
      log: (message) => logs.push(message),
    });
    assert.equal(responses.length, 0, "All expected responses must be used");
    return result;
  };
  return { run, commands, logs };
}

test("eligibility requires authenticated same-repository Dependabot metadata", () => {
  const pr = pullRequest();
  assert.equal(isEligiblePullRequest(pr, repository), true);
  const rejected = [
    { number: 0 },
    { number: "1; exit 1" },
    { state: "closed" },
    { draft: true },
    { draft: undefined },
    { user: { login: "dependabot[bot]", type: "User" } },
    { user: { login: "someone-else[bot]", type: "Bot" } },
    { user: null },
    { head: { ...pr.head, repo: { full_name: "attacker/repository" } } },
    { head: { ...pr.head, repo: null } },
    { head: { ...pr.head, ref: "chore/not-dependabot" } },
    { head: { ...pr.head, sha: "not-a-commit" } },
    { base: { ...pr.base, ref: "other-branch" } },
    { base: { ...pr.base, repo: { full_name: "other/repository" } } },
  ];
  for (const change of rejected) {
    assert.equal(
      isEligiblePullRequest({ ...pr, ...change }, repository),
      false,
    );
  }
});

test("empty and ineligible queues do not mutate any pull request", () => {
  for (const pages of [
    [],
    [[]],
    [[pullRequest(1, { user: { login: "someone-else", type: "User" } })]],
  ]) {
    const { run, commands } = fixture([pages]);
    assert.equal(run(), "empty");
    assert.deepEqual(commands, [listCommand()]);
  }
});

test("all list pages are considered and only the oldest stale PR is refreshed", () => {
  const first = pullRequest(1);
  const second = pullRequest(2);
  const { run, commands } = fixture([
    [[second], [first]],
    first,
    {},
    first,
    { message: "Updating pull request branch." },
  ]);
  assert.equal(run(), "updated");
  assert.deepEqual(commands, [
    listCommand(),
    readCommand(),
    mergeCommand(),
    readCommand(),
    updateCommand(),
  ]);
});

test("a fresh head is used rather than the stale list snapshot", () => {
  const current = pullRequest();
  current.head.sha = "b".repeat(40);
  const { run, commands } = fixture([
    [[pullRequest()]],
    current,
    {},
    current,
    {},
  ]);
  assert.equal(run(), "updated");
  assert.deepEqual(commands.at(2), mergeCommand(1, current.head.sha));
  assert.deepEqual(commands.at(-1), updateCommand(1, current.head.sha));
});

test("ineligible or closed PRs in a stale list are rechecked before mutation", () => {
  for (const current of [
    pullRequest(1, { state: "closed" }),
    pullRequest(1, { draft: true }),
    pullRequest(1, { user: { login: "someone-else", type: "User" } }),
  ]) {
    const { run, commands } = fixture([[[pullRequest()]], current]);
    assert.equal(run(), "empty");
    assert.deepEqual(commands, [listCommand(), readCommand()]);
  }
});

test("conflicting or unknown mergeability waits without mutations", () => {
  for (const mergeable of [false, null]) {
    const { run, commands } = fixture([
      [[pullRequest(), pullRequest(2)]],
      pullRequest(1, { mergeable }),
    ]);
    assert.equal(run(), "waiting");
    assert.deepEqual(commands, [listCommand(), readCommand()]);
  }
});

test("an up-to-date open PR holds the queue until its gates are satisfied", () => {
  for (const mergeable_state of ["clean", "blocked", "unstable", "unknown"]) {
    const current = pullRequest(1, { mergeable_state });
    const { run, commands } = fixture([
      [[current, pullRequest(2)]],
      current,
      {},
      current,
    ]);
    assert.equal(run(), "waiting");
    assert.deepEqual(commands, [
      listCommand(),
      readCommand(),
      mergeCommand(),
      readCommand(),
    ]);
  }
});

test("an observed immediate merge advances to the next PR without a refresh", () => {
  const first = pullRequest(1, { mergeable_state: "clean" });
  const second = pullRequest(2);
  const { run, commands } = fixture([
    [[second, first]],
    first,
    {},
    { ...first, state: "closed", merged: true },
    second,
    {},
    second,
    {},
  ]);
  assert.equal(run(), "updated");
  assert.deepEqual(commands, [
    listCommand(),
    readCommand(),
    mergeCommand(),
    readCommand(),
    readCommand(2),
    mergeCommand(2),
    readCommand(2),
    updateCommand(2),
  ]);
});

test("a changed head or eligibility after auto-merge is deferred, not refreshed", () => {
  const pr = pullRequest();
  for (const current of [
    { ...pr, head: { ...pr.head, sha: "c".repeat(40) } },
    { ...pr, draft: true },
    { ...pr, base: { ...pr.base, ref: "other-branch" } },
    { ...pr, head: { ...pr.head, repo: null } },
  ]) {
    const { run, commands } = fixture([[[pr]], pr, {}, current]);
    assert.equal(run(), "waiting");
    assert.equal(commands.length, 4);
  }
});

test("mergeability must still be known before refreshing", () => {
  const pr = pullRequest();
  const { run, commands } = fixture([
    [[pr]],
    pr,
    {},
    { ...pr, mergeable: null },
  ]);
  assert.equal(run(), "waiting");
  assert.equal(commands.length, 4);
});

test("auto-merge failures stop the run without updating a branch", () => {
  const pr = pullRequest();
  const { run, commands } = fixture([[[pr]], pr, new Error("head changed")]);
  assert.throws(run, /head changed/u);
  assert.deepEqual(commands, [listCommand(), readCommand(), mergeCommand()]);
});

test("update rejection fails closed with no blind retry or second refresh", () => {
  const pr = pullRequest();
  const { run, commands } = fixture([
    [[pr, pullRequest(2)]],
    pr,
    {},
    pr,
    new Error("HTTP 422: expected head does not match"),
  ]);
  assert.throws(run, /HTTP 422/u);
  assert.deepEqual(commands.at(-1), updateCommand());
  assert.equal(commands.length, 5);
});

test("malformed projected numbers fail before reading or mutating a PR", () => {
  for (const output of [
    "1;exit",
    "../123",
    "-1",
    "1.5",
    "999999999999999999",
  ]) {
    const { run, commands } = fixture([output]);
    assert.throws(run, /invalid pull request number/u);
    assert.deepEqual(commands, [listCommand()]);
  }
});

test("invalid repository values fail before any GitHub command", () => {
  for (const repository of [undefined, "", "-R owner/repo", "https://x/y"]) {
    assert.throws(
      () => runDependabotQueue({ repository, gh: () => assert.fail() }),
      /owner\/repository/u,
    );
  }
});

test("workflow retains trusted triggers, serialization, credentials, and gates", () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL("../workflows/dependabot-auto-merge.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(workflow.on).sort(), [
    "schedule",
    "workflow_dispatch",
  ]);
  assert.deepEqual(workflow.on.schedule, [{ cron: "17,47 * * * *" }]);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.concurrency, {
    group: "dependabot-auto-merge",
    "cancel-in-progress": false,
  });
  const job = workflow.jobs["auto-merge"];
  assert.equal(job.permissions, undefined);
  const tokenStep = job.steps.find((step) => step.id === "app-token");
  assert.deepEqual(JSON.parse(tokenStep.env.TOKEN_PERMISSIONS), {
    contents: "write",
    pull_requests: "write",
  });
  const checkout = job.steps.find((step) =>
    step.uses?.startsWith("actions/checkout@"),
  );
  assert.equal(checkout.with["persist-credentials"], false);
  assert.equal(checkout.with.ref, undefined);
  const queueStep = job.steps.at(-1);
  assert.equal(queueStep.run, "node .github/scripts/run-dependabot-queue.mjs");
  assert.equal(queueStep["continue-on-error"], undefined);
  assert.match(queueStep.env.GH_TOKEN, /steps\.app-token\.outputs\.token/u);
  const packageRecord = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  assert.match(
    packageRecord.scripts["test:automation"],
    /run-dependabot-queue\.test\.mjs/u,
  );
});
