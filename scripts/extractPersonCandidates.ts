/**
 * Extract named-person review candidates from AFRIK people-fiche prose
 * (DEC-031, ETNI-1387).
 *
 * The command is deliberately read-only with respect to the corpus and never
 * touches Supabase. Its only output is a review artifact outside
 * dataset/source/afrik; publication into the `persons` table (migration 057)
 * is a later, explicit step gated on a human setting reviewStatus to
 * "approved" — see scripts/lib/personCandidateReview.ts and
 * docs/runbooks/person-extraction.md.
 *
 * Usage: npx tsx scripts/extractPersonCandidates.ts [output-path]
 */

import path from "path";

import type { PersonCandidateReviewArtifact } from "./lib/personCandidateTypes";
import { detectPersonCandidates } from "./lib/personCandidateDetection";
import { writeCandidateArtifact } from "./lib/peopleProseCandidates";

const DEFAULT_PEOPLE_ROOT = path.join(
  __dirname,
  "../dataset/source/afrik/peuples"
);
const DEFAULT_OUTPUT_PATH = path.join(
  __dirname,
  "../.tmp/person-candidates.json"
);

export interface ExtractPersonCandidatesOptions {
  peopleRoot?: string;
  outputPath?: string;
}

export interface ExtractPersonCandidatesResult {
  fichesScanned: number;
  outputPath: string;
  artifact: PersonCandidateReviewArtifact;
}

/**
 * Walk the people corpus and write a deterministic review artifact. Every
 * candidate is anchored to a verbatim sentence (REQ-126, AC1) and starts
 * "unreviewed" — this function never writes to the database or the corpus.
 */
export function extractPersonCandidatesToArtifact(
  options: ExtractPersonCandidatesOptions = {}
): ExtractPersonCandidatesResult {
  return writeCandidateArtifact({
    commandName: "extractPersonCandidates",
    peopleRoot: options.peopleRoot ?? DEFAULT_PEOPLE_ROOT,
    outputPath: options.outputPath ?? DEFAULT_OUTPUT_PATH,
    detect: detectPersonCandidates,
    buildArtifact: (_fiches, candidates): PersonCandidateReviewArtifact => ({
      schemaVersion: 1,
      candidates,
    }),
  });
}

function main(): void {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  const result = extractPersonCandidatesToArtifact({ outputPath });
  console.log(
    `Person review artifact: ${result.artifact.candidates.length} candidates from ${result.fichesScanned} fiches -> ${result.outputPath}`
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
