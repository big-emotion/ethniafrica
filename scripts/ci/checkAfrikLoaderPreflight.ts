/**
 * Pre-merge gate for the corpus-wide checks only the AFRIK loader performs.
 *
 * `validateAfrikData.ts` reads one fiche at a time, so it cannot see the two
 * ways a patronyme corpus contradicts itself across files: a fiche pointing at
 * an entity no other fiche declares, and one work cited by two fiches under
 * different tiers, locators or provenance — the loader keys sources by title,
 * so the second spelling of a URL makes it refuse the whole batch.
 *
 * That refusal is total. One bad fiche stops the corpus from loading, the sync
 * job exits before `--apply`, and the database silently keeps its previous
 * content while the pull request that introduced the fault merges green. This
 * gate runs the loader's own cross-reference pass against the corpus, with no
 * database, so the fault is caught on the pull request instead of on the site.
 */
import { readdirSync } from "fs";
import { join } from "path";

import {
  loadAllPatronymeDossiers,
  preflightPatronymeBatch,
  type PatronymeBatch,
  type PatronymeReferenceIds,
} from "../../src/lib/afrik/loaders/patronymeJsonLoader";

const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

function idsFromFilenames(directory: string, pattern: RegExp): Set<string> {
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return new Set();
  }
  return new Set(
    entries.flatMap((entry) => {
      const match = pattern.exec(entry);
      return match ? [match[1]] : [];
    })
  );
}

/**
 * The reference universe a pull request can actually be judged against: what
 * the corpus declares, not what a database happens to hold. The two agree once
 * a sync succeeds, and when they disagree it is the corpus that is authoritative.
 */
// @req REQ-133
// @req REQ-134
export function corpusPatronymeReferenceIds(
  datasetRoot: string = AFRIK_ROOT
): PatronymeReferenceIds {
  const peopleIds = new Set<string>();
  const peoplesRoot = join(datasetRoot, "peuples");
  let families: string[];
  try {
    families = readdirSync(peoplesRoot);
  } catch {
    families = [];
  }
  for (const family of families) {
    for (const id of idsFromFilenames(
      join(peoplesRoot, family),
      /^(PPL_[A-Z0-9_]+)\.json$/
    )) {
      peopleIds.add(id);
    }
  }

  return {
    peopleIds,
    countryIds: idsFromFilenames(
      join(datasetRoot, "pays"),
      /^([A-Z]{3})\.json$/
    ),
    personIds: idsFromFilenames(
      join(datasetRoot, "personnes"),
      /^(PER_[A-Z0-9_]+)\.json$/
    ),
    // Patronymes referencing each other resolve against the batch itself:
    // `preflightPatronymeBatch` unions the dossier ids it was handed.
    patronymeIds: new Set<string>(),
  };
}

// @req REQ-133
// @req REQ-134
export function findPatronymeLoaderBlockers(
  batch: PatronymeBatch = loadAllPatronymeDossiers(),
  references: PatronymeReferenceIds = corpusPatronymeReferenceIds()
): string[] {
  return [
    ...batch.errors,
    ...preflightPatronymeBatch(batch.dossiers, references),
  ];
}

if (require.main === module) {
  const blockers = findPatronymeLoaderBlockers();
  for (const blocker of blockers) {
    process.stdout.write(`::error::${blocker}\n`);
  }
  process.stdout.write(
    blockers.length === 0
      ? "AFRIK loader preflight: the patronyme corpus loads cleanly.\n"
      : `AFRIK loader preflight: ${blockers.length} blocker(s) would stop the corpus from loading.\n`
  );
  process.exitCode = blockers.length === 0 ? 0 : 1;
}
