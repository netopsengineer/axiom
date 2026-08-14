#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { loadMarketplaceContract } from "./lib/marketplace-contract.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const contract = await loadMarketplaceContract(ROOT);

for (const { name } of contract.plugins) {
  process.stdout.write(`${name}\n`);
}
