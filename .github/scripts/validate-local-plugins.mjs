import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMarketplaceContract } from "./lib/marketplace-contract.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const contract = await loadMarketplaceContract(ROOT);

console.log("Validating .claude-plugin/marketplace.json");
await run("claude", [
  "plugin",
  "validate",
  "./.claude-plugin/marketplace.json",
  "--strict",
]);

for (const { name } of contract.plugins) {
  const pluginDir = path.posix.join("plugins", name);
  console.log(`Validating ${pluginDir}`);
  await run("claude", ["plugin", "validate", `./${pluginDir}`, "--strict"]);
}

console.log(
  `Validated the Claude marketplace and ${contract.plugins.length} plugin(s) in strict mode.`,
);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            `Could not find "${command}" on PATH. Install the Claude Code CLI before running local plugin validation.`,
          ),
        );
        return;
      }

      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${
            signal ? `signal ${signal}` : `exit code ${code}`
          }.`,
        ),
      );
    });
  });
}
