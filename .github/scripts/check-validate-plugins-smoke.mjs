import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertClaudePackageContract,
  CLAUDE_BIN,
  CLAUDE_SHIM_DIR,
} from "./lib/claude-package-contract.mjs";

// Valid 512-by-512 PNG for temporary test fixtures, not a shipped plugin asset.
const FIXTURE_ICON = Buffer.from(
  [
    "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAAAAADRE4smAAABFUlEQVR42u3BMQEA",
    "AADCoPVP7WkJoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AYCPAAByZWgVQAAAABJRU5ErkJggg==",
  ].join(""),
  "base64",
);

const ROOT = process.cwd();
// Validation is local-only; do not send CLI telemetry or fetch feature flags.
const VALIDATOR_ENV = {
  ...process.env,
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
};
const ACTION_PATH = path.join(
  ROOT,
  ".github/actions/validate-plugins/upstream",
);
const SCRIPTS_PATH = path.join(ACTION_PATH, "scripts");

const cases = [
  ["known-good fixture passes", runGoodFixture],
  ["known-bad fixture fails", runBadFixture],
  ["warnings fail when fail-on-warnings is true", runWarningFixture],
  ["CLI directory warnings still fail", runCliWarningFixture],
];

await preflight();

for (const [name, run] of cases) {
  run();
  console.log(`PASS ${name}`);
}

console.log(
  `validate-plugins smoke tests passed (${cases.length}/${cases.length}).`,
);

function runGoodFixture() {
  const fixture = createFixture("good", {
    pluginName: "validator-smoke-good",
    pluginDescription: "Valid plugin fixture for validator smoke testing.",
    marketplaceDescription: "Valid plugin fixture for validator smoke testing.",
  });

  try {
    runValidatorScript(fixture, "11-validate-invariants.sh", {
      expect: "pass",
    });
    runValidatorScript(fixture, "20-validate-cli-marketplace.sh", {
      expect: "pass",
    });
    runValidatorScript(fixture, "40-validate-cli-local.sh", { expect: "pass" });
    runValidatorScript(fixture, "41-validate-aux-files.sh", { expect: "pass" });
  } finally {
    fixture.cleanup();
  }
}

function runBadFixture() {
  const fixture = createFixture("bad", {
    pluginName: null,
    entryName: "validator-smoke-bad",
    pluginDescription: "Invalid plugin fixture for validator smoke testing.",
    marketplaceDescription:
      "Invalid plugin fixture for validator smoke testing.",
  });

  try {
    runValidatorScript(fixture, "40-validate-cli-local.sh", {
      expect: "fail",
      includes: ["claude plugin validate failed", "name"],
    });
  } finally {
    fixture.cleanup();
  }
}

function runWarningFixture() {
  const fixture = createFixture("warn", {
    pluginName: "validator-smoke-warn",
    pluginDescription: "Valid plugin fixture for validator smoke testing.",
    marketplaceDescription: "short",
    warnInvariants: "I3",
  });

  try {
    runValidatorScript(fixture, "11-validate-invariants.sh", {
      expect: "fail",
      includes: ["warning", "fail-on-warnings"],
    });
  } finally {
    fixture.cleanup();
  }
}

function runCliWarningFixture() {
  const fixture = createFixture("cli-warning", {
    pluginName: "validator-smoke-cli-warning",
    pluginDescription: "Valid plugin fixture for validator smoke testing.",
    marketplaceDescription: "Valid plugin fixture for validator smoke testing.",
  });

  try {
    rmSync(
      path.join(
        fixture.workspace,
        "plugins/cli-warning/.claude-plugin/icon.png",
      ),
    );
    runValidatorScript(fixture, "40-validate-cli-local.sh", {
      expect: "fail",
      includes: ["ICON_MISSING", "fail-on-warnings"],
    });
  } finally {
    fixture.cleanup();
  }
}

function createFixture(
  slug,
  {
    pluginName,
    entryName = pluginName,
    pluginDescription,
    marketplaceDescription,
    warnInvariants = "",
  },
) {
  const root = mkdtempSync(
    path.join(tmpdir(), `axiom-validator-smoke-${slug}-`),
  );
  const workspace = path.join(root, "workspace");
  const validateTmp = path.join(root, "validate");
  const pluginFolder = `plugins/${slug}`;
  const manifestDir = path.join(workspace, pluginFolder, ".claude-plugin");
  const marketplaceDir = path.join(workspace, ".claude-plugin");

  mkdirSync(manifestDir, { recursive: true });
  mkdirSync(marketplaceDir, { recursive: true });
  mkdirSync(validateTmp, { recursive: true });

  writeJson(path.join(manifestDir, "plugin.json"), {
    $schema: "https://json.schemastore.org/claude-code-plugin-manifest.json",
    ...(pluginName ? { name: pluginName } : {}),
    displayName: `Validator Smoke ${titleCase(slug)}`,
    description: pluginDescription,
    version: "1.0.0",
    author: { name: "axiom" },
    license: "MIT",
  });

  // Current Claude CLI also reports directory readiness warnings. Keep the
  // baseline fixture complete rather than disabling the strict warning gate.
  writeFileSync(path.join(manifestDir, "icon.png"), FIXTURE_ICON);
  writeFileSync(
    path.join(workspace, pluginFolder, "README.md"),
    `# Validator smoke fixture

This temporary plugin exists only to exercise the repository validator. Run the
validator smoke test from the repository root to check valid manifests, invalid
manifests, and strict warning handling. It requires no credentials, external
services, or user configuration and is deleted when the test completes.
`,
  );

  const marketplacePath = path.join(marketplaceDir, "marketplace.json");
  writeJson(marketplacePath, {
    $schema: "https://json.schemastore.org/claude-code-marketplace.json",
    name: "validator-smoke",
    description: "Marketplace fixture for validator smoke testing.",
    owner: { name: "axiom" },
    plugins: [
      {
        name: entryName,
        description: marketplaceDescription,
        source: `./${pluginFolder}`,
        category: "testing",
      },
    ],
  });

  cpSync(marketplacePath, path.join(validateTmp, "marketplace.json"));
  writeJson(path.join(validateTmp, "changes.json"), {
    entries: [entryName],
    external: [],
    folders: [pluginFolder],
  });

  return {
    workspace,
    validateTmp,
    warnInvariants,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function runValidatorScript(fixture, scriptName, { expect, includes = [] }) {
  const result = spawnSync("bash", [path.join(SCRIPTS_PATH, scriptName)], {
    cwd: fixture.workspace,
    encoding: "utf8",
    env: {
      ...VALIDATOR_ENV,
      PATH: `${CLAUDE_SHIM_DIR}${path.delimiter}${process.env.PATH ?? ""}`,
      ACTION_PATH,
      BASE_REF: "HEAD",
      FAIL_ON_WARNINGS: "true",
      MARKETPLACE_PATH: ".claude-plugin/marketplace.json",
      VALIDATE_TMP: fixture.validateTmp,
      WARN_INVARIANTS: fixture.warnInvariants,
    },
    maxBuffer: 16 * 1024 * 1024,
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const passed = result.status === 0;
  if (expect === "pass" && !passed) {
    throw new Error(`${scriptName} should have passed.\n${output}`);
  }
  if (expect === "fail" && passed) {
    throw new Error(
      `${scriptName} should have failed but exited 0.\n${output}`,
    );
  }
  for (const text of includes) {
    if (!output.includes(text)) {
      throw new Error(
        `${scriptName} output did not include ${JSON.stringify(text)}.\n${output}`,
      );
    }
  }
}

async function preflight() {
  await assertClaudePackageContract();
  for (const command of ["bash", "jq", CLAUDE_BIN]) {
    const result = spawnSync(command, ["--version"], {
      env: VALIDATOR_ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.error || result.status !== 0) {
      throw new Error(
        `validate-plugins smoke tests require ${command} on PATH. ${result.error?.message || result.stderr || ""}`,
      );
    }
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
