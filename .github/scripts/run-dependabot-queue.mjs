import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function runGh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

// Only trusted GitHub metadata decides eligibility. Never check out a PR head
// or use its title, body, or URL as a command or API endpoint.
export function isEligiblePullRequest(pr, repository) {
  return (
    Number.isSafeInteger(pr.number) &&
    pr.number > 0 &&
    pr.state === "open" &&
    pr.draft === false &&
    pr.user?.login === "dependabot[bot]" &&
    pr.user?.type === "Bot" &&
    pr.head?.repo?.full_name === repository &&
    pr.base?.repo?.full_name === repository &&
    pr.base?.ref === "main" &&
    pr.head?.ref?.startsWith("dependabot/") &&
    /^[a-f0-9]{40}$/u.test(pr.head?.sha ?? "")
  );
}

export function runDependabotQueue({
  repository,
  gh = runGh,
  log = console.log,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository ?? "")) {
    throw new Error("GITHUB_REPOSITORY must be an owner/repository name.");
  }
  const endpoint = `repos/${repository}/pulls`;
  // Project only numbers before buffering stdout: PR bodies can be large and
  // are never needed by this trusted automation. Each page emits one number
  // per matching PR; all eligibility metadata is re-read below before acting.
  const numbers = gh([
    "api",
    "--paginate",
    `${endpoint}?state=open&per_page=100`,
    "--jq",
    '.[] | select(.user.login == "dependabot[bot]" and .user.type == "Bot") | .number',
  ]);
  const candidates = numbers
    .split(/\s+/u)
    .filter(Boolean)
    .map((value) => {
      const number = Number(value);
      if (!/^[1-9]\d*$/u.test(value) || !Number.isSafeInteger(number)) {
        throw new Error("GitHub returned an invalid pull request number.");
      }
      return number;
    })
    .sort((left, right) => left - right);

  for (const number of new Set(candidates)) {
    const prEndpoint = `${endpoint}/${number}`;
    const pr = JSON.parse(gh(["api", prEndpoint]));
    if (!isEligiblePullRequest(pr, repository)) continue;
    if (pr.mergeable !== true) {
      log(`PR #${pr.number}: waiting for mergeability or conflict resolution.`);
      return "waiting";
    }

    log(`PR #${pr.number}: enabling protected App-attributed auto-merge.`);
    gh([
      "pr",
      "merge",
      String(pr.number),
      "--repo",
      repository,
      "--auto",
      "--squash",
      "--match-head-commit",
      pr.head.sha,
    ]);

    // A ready PR can merge immediately. Refresh metadata before doing anything
    // else, including moving to the next queue entry after an observed merge.
    const current = JSON.parse(gh(["api", prEndpoint]));
    if (current.state === "closed") continue;
    if (
      !isEligiblePullRequest(current, repository) ||
      current.head.sha !== pr.head.sha
    ) {
      log(
        `PR #${pr.number}: changed during this run; deferring to the next run.`,
      );
      return "waiting";
    }
    if (current.mergeable === true && current.mergeable_state === "behind") {
      gh([
        "api",
        "--method",
        "PUT",
        `${prEndpoint}/update-branch`,
        "--raw-field",
        `expected_head_sha=${current.head.sha}`,
      ]);
      log(
        `PR #${pr.number}: branch refresh requested; waiting for required CI.`,
      );
      // The update is asynchronous. Never refresh another branch in this run
      // or advance past this open PR on a later run before it merges/closes.
      return "updated";
    }
    log(
      `PR #${pr.number}: waiting for required checks and merge requirements.`,
    );
    return "waiting";
  }
  log("No eligible same-repository Dependabot pull requests remain open.");
  return "empty";
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runDependabotQueue({ repository: process.env.GITHUB_REPOSITORY });
}
