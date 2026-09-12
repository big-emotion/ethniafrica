/**
 * Extract clan-name review candidates from AFRIK people-fiche prose.
 *
 * The command is deliberately read-only with respect to the corpus. Its only
 * output is a review artifact outside dataset/source/afrik; a later, explicit
 * workflow owns any persistence into the PAT_* patronyme dimension.
 *
 * Usage: npx tsx scripts/extractClanNames.ts [output-path]
 */

import path from "path";

import type { ClanNameReviewArtifact } from "./lib/clanNameTypes";
import { detectClanNameCandidates } from "./lib/clanNameDetection";
import { buildCoverageByFamily } from "./lib/clanNameReview";
import { writeCandidateArtifact } from "./lib/peopleProseCandidates";

const DEFAULT_PEOPLE_ROOT = path.join(
  __dirname,
  "../dataset/source/afrik/peuples"
);
const DEFAULT_OUTPUT_PATH = path.join(
  __dirname,
  "../.tmp/clan-name-candidates.json"
);

export interface ExtractClanNamesOptions {
  peopleRoot?: string;
  outputPath?: string;
}

export interface ExtractClanNamesResult {
  fichesScanned: number;
  outputPath: string;
  artifact: ClanNameReviewArtifact;
}

/** Walk the people corpus and write a deterministic review artifact. */
export function extractClanNamesToArtifact(
  options: ExtractClanNamesOptions = {}
): ExtractClanNamesResult {
  return writeCandidateArtifact({
    commandName: "extractClanNames",
    peopleRoot: options.peopleRoot ?? DEFAULT_PEOPLE_ROOT,
    outputPath: options.outputPath ?? DEFAULT_OUTPUT_PATH,
    detect: detectClanNameCandidates,
    buildArtifact: (fiches, candidates): ClanNameReviewArtifact => ({
      schemaVersion: 1,
      candidates,
      coverageByFamily: buildCoverageByFamily(fiches, candidates),
    }),
  });
}

function main(): void {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  const result = extractClanNamesToArtifact({ outputPath });
  console.log(
    `Clan-name review artifact: ${result.artifact.candidates.length} candidates from ${result.fichesScanned} fiches -> ${result.outputPath}`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
