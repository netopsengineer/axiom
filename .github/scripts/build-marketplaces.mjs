#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import {
  compareGeneratedOutputs,
  loadMarketplaceContract,
  renderMarketplaceOutputs,
  writeOutputTransaction,
} from "./lib/marketplace-contract.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const argumentsList = process.argv.slice(2);
const checkMode = argumentsList.length === 1 && argumentsList[0] === "--check";

if (argumentsList.length > 0 && !checkMode) {
  console.error("Usage: node .github/scripts/build-marketplaces.mjs [--check]");
  process.exit(2);
}

try {
  const contract = await loadMarketplaceContract(REPOSITORY_ROOT);
  const outputs = renderMarketplaceOutputs(contract);

  if (checkMode) {
    const stalePaths = await compareGeneratedOutputs(REPOSITORY_ROOT, outputs);
    if (stalePaths.length > 0) {
      console.error("Generated marketplace artifacts are stale:");
      for (const stalePath of stalePaths) {
        console.error(`- ${stalePath}`);
      }
      console.error(
        "Run `npm run marketplaces:build` and restage the outputs.",
      );
      process.exit(1);
    }

    console.log("Generated marketplace artifacts are current.");
    process.exit(0);
  }

  const changedPaths = await writeOutputTransaction(REPOSITORY_ROOT, outputs);
  if (changedPaths.length === 0) {
    console.log("Generated marketplace artifacts are already current.");
    process.exit(0);
  }

  console.log("Generated marketplace artifacts updated:");
  for (const changedPath of changedPaths) {
    console.log(`- ${changedPath}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
