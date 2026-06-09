import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const pluginDirs = (
  await readdir(path.join(ROOT, "plugins"), { withFileTypes: true })
)
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
  .map((entry) => path.join("plugins", entry.name))
  .sort();

if (pluginDirs.length === 0) {
  console.error("No plugin directories found under plugins/.");
  process.exit(1);
}

for (const pluginDir of pluginDirs) {
  console.log(`Validating ${pluginDir}`);
  await run("claude", ["plugin", "validate", `./${pluginDir}`]);
}

console.log(`Validated ${pluginDirs.length} plugin(s).`);

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
