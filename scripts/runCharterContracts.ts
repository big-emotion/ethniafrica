import { spawnSync } from "node:child_process";
import { charterContractFiles } from "./charterContractManifest";

// Blocking gate (ETNI-982 · FR110): runs the aggregated charter contract
// suite as its own named CI step so a regression reads as "charter contract
// suite failed" instead of hiding in the generic `test:coverage` run.
const files = charterContractFiles();
console.log(`Running ${files.length} charter contract test file(s)...`);

const result = spawnSync("npx", ["vitest", "run", ...files], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
