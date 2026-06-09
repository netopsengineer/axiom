import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const MARKDOWN_FILE = /\.md$/i;
const DEFAULT_EXCLUDES = [
  /^dev\//,
  /^node_modules\//,
  /^plugins\/[^/]+\/CHANGELOG\.md$/,
  /^DEMO-/,
];

const files = await getTargetFiles();
if (files.length === 0) {
  console.log("No Markdown files selected for link checking.");
  process.exit(0);
}

let failed = false;
for (const file of files) {
  try {
    const { stdout, stderr } = await execFileAsync(
      markdownLinkCheckBin(),
      ["--config", ".markdown-link-check.json", "--quiet", file],
      { cwd: ROOT },
    );
    if (stdout.trim()) {
      process.stdout.write(stdout);
    }
    if (stderr.trim()) {
      process.stderr.write(stderr);
    }
  } catch (error) {
    failed = true;
    if (error.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error.stderr) {
      process.stderr.write(error.stderr);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Markdown links passed for ${files.length} file(s).`);

async function getTargetFiles() {
  const args = process.argv.slice(2).filter((file) => MARKDOWN_FILE.test(file));
  if (args.length > 0) {
    return normalizeFiles(args);
  }

  const { stdout } = await execFileAsync("git", ["ls-files", "*.md"]);
  return normalizeFiles(stdout.split("\n").filter(Boolean));
}

function normalizeFiles(paths) {
  return [...new Set(paths.map(toPosixPath))]
    .filter((file) => MARKDOWN_FILE.test(file))
    .filter((file) => !DEFAULT_EXCLUDES.some((exclude) => exclude.test(file)))
    .sort();
}

function markdownLinkCheckBin() {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return path.join(
    ROOT,
    "node_modules",
    ".bin",
    `markdown-link-check${suffix}`,
  );
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
