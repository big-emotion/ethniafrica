#!/usr/bin/env npx tsx
/**
 * Prints how far the `PAT_*` corpus has moved past the coverage wave that
 * created it, per linguistic family.
 *
 * It exists because the same tally has now gone stale twice by being kept by
 * hand: docs/runbooks/anthroponym-coverage-plan.md still reported wave 01's
 * split long after seventeen depth waves had landed, and the two `nommer`
 * figures each published whichever wave merged last as the corpus total
 * (#810). The output is markdown so the runbook can be refreshed by pasting
 * it rather than by counting again.
 */

import { resolve } from "node:path";

import { loadAllPatronymeDossiers } from "../../src/lib/afrik/loaders/patronymeJsonLoader";
import {
  classifyDepth,
  peopleFamilyIndex,
  summariseAnthroponymDepth,
} from "../lib/anthroponymDepth";

const CORPUS = resolve(process.cwd(), "dataset/source/afrik");

function row(cells: (string | number)[]): string {
  return `| ${cells.join(" | ")} |`;
}

function main(): void {
  const { dossiers, errors } = loadAllPatronymeDossiers(CORPUS);
  if (errors.length > 0) {
    console.error(`${errors.length} loader errors:`);
    for (const error of errors) console.error(`  ${error}`);
    process.exitCode = 1;
    return;
  }

  const depth = summariseAnthroponymDepth(dossiers, peopleFamilyIndex(CORPUS));

  console.log(`## Depth, measured on ${dossiers.length} PAT_* fiches\n`);
  console.log(row(["Stage", "Fiches"]));
  console.log(row(["---", "---:"]));
  console.log(
    row(["Nothing but the candidate queue", depth.byStage["queue-only"]])
  );
  console.log(
    row([
      "A source, no sourced origin claim",
      depth.byStage["unsourced-origin"],
    ])
  );
  console.log(
    row([
      "A sourced claim, `transmissionMode` still `other`",
      depth.byStage["undeclared-transmission"],
    ])
  );
  console.log(row(["**Documented**", `**${depth.byStage.documented}**`]));
  console.log(row(["Remaining", depth.remaining]));

  console.log(`\n## By family\n`);
  console.log(
    row(["Family", "Fiches", "Documented", "Remaining", "Queue only"])
  );
  console.log(row(["---", "---:", "---:", "---:", "---:"]));
  for (const family of depth.families) {
    console.log(
      row([
        `\`${family.familyId}\``,
        family.fiches,
        family.byStage.documented,
        family.remaining,
        family.byStage["queue-only"],
      ])
    );
  }
  console.log(
    row([
      "_no people_",
      depth.withoutFamily.fiches,
      depth.withoutFamily.byStage.documented,
      depth.withoutFamily.remaining,
      depth.withoutFamily.byStage["queue-only"],
    ])
  );

  // The two figures src/lib/dossiers/nommer/figures.ts publishes, on the same
  // perimeter, so a wave can check them without re-deriving the rule.
  const sourced = dossiers.filter(
    (dossier) => classifyDepth(dossier) !== "queue-only"
  );
  const nonHereditary = sourced.filter(
    (dossier) => dossier.transmissionMode === "non_hereditary"
  );

  console.log(`\n## nommer figures\n`);
  console.log(row(["Figure key", "Value"]));
  console.log(row(["---", "---:"]));
  console.log(row(["`patronyme-fiches`", sourced.length]));
  console.log(row(["`patronyme-non-hereditary`", nonHereditary.length]));
}

main();
