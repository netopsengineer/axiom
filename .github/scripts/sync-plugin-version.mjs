#!/usr/bin/env node
// Sets the "version" field of a Claude plugin manifest to the version that
// semantic-release computed. Invoked from release.config.js (prepareCmd):
//
//   node .github/scripts/sync-plugin-version.mjs <manifest-path> <version>
//
// Rewrites only the version field, preserving 2-space indentation and a
// trailing newline so the diff stays to a single line.
import { readFileSync, writeFileSync } from "node:fs";

const [, , manifestPath, version] = process.argv;

if (!manifestPath || !version) {
  console.error("usage: sync-plugin-version.mjs <manifest-path> <version>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const previous = manifest.version;
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`${manifestPath}: ${previous ?? "(unset)"} -> ${version}`);
