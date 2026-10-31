import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// semantic-release-monorepo 8.0.2 only calls tempy.directory() without options.
// Like that API, the caller owns cleanup. Never interpret paths as globs.
function directory(...args) {
  if (args.length !== 0) {
    throw new TypeError("The axiom tempy adapter only supports directory()");
  }
  return mkdtempSync(path.join(tmpdir(), "axiom-release-"));
}

export default Object.freeze({ directory });
