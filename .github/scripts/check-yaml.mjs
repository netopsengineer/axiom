import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import YAML from "yaml";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const YAML_FILE = /\.ya?ml$/i;
const DEFAULT_EXCLUDES = [/^node_modules\//, /^dev\//];

const files = await getTargetFiles();
let failed = false;

for (const file of files) {
  const text = await readFile(path.join(ROOT, file), "utf8");
  const document = YAML.parseDocument(text, {
    prettyErrors: true,
    strict: true,
  });

  const problems = [...document.errors, ...document.warnings];
  if (problems.length > 0) {
    failed = true;
    console.error(`${file}:`);
    for (const problem of problems) {
      console.error(`  ${problem.message}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`YAML syntax passed for ${files.length} file(s).`);

async function getTargetFiles() {
  const args = process.argv.slice(2).filter((file) => YAML_FILE.test(file));
  if (args.length > 0) {
    return normalizeFiles(args);
  }

  const { stdout } = await execFileAsync("git", [
    "ls-files",
    "*.yml",
    "*.yaml",
  ]);
  return normalizeFiles(stdout.split("\n").filter(Boolean));
}

function normalizeFiles(paths) {
  return [...new Set(paths.map(toPosixPath))]
    .filter((file) => YAML_FILE.test(file))
    .filter((file) => !DEFAULT_EXCLUDES.some((exclude) => exclude.test(file)))
    .sort();
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
