import { readFileSync } from "fs";

import { countPlannedMigrations } from "../lib/countPlannedMigrations";

const planPath = process.argv[2];

if (!planPath) {
  console.error("usage: countPlannedMigrations.ts <plan-file>");
  process.exit(2);
}

console.log(countPlannedMigrations(readFileSync(planPath, "utf-8")));
