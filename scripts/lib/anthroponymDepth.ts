import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * How far a `PAT_*` fiche has moved from the coverage wave that created it.
 *
 * The stages are ordered by what a session has to do next, not by severity:
 * a fiche whose only source is the candidate queue needs a source before
 * anything else can be asserted about it, so that shortfall is reported even
 * when the origin is empty too. `documented` is the definition of done that
 * docs/runbooks/anthroponym-fiche-research.md states.
 */
export const DEPTH_STAGES = [
  "queue-only",
  "unsourced-origin",
  "undeclared-transmission",
  "documented",
] as const;

export type DepthStage = (typeof DEPTH_STAGES)[number];

/**
 * The subset of a `PatronymeDossier` the tally reads. Narrow on purpose: the
 * loader's full type satisfies it, and a test does not have to build a whole
 * fiche to exercise the classification.
 */
export interface DepthReadableDossier {
  id?: string;
  transmissionMode?: string;
  sources?: { source_kind?: string }[];
  origin?: {
    oralTraditions?: unknown[];
    writtenChronicles?: unknown[];
    linguisticReconstructions?: unknown[];
  };
  peoples?: { peopleId?: string }[];
}

export interface FamilyDepth {
  familyId: string;
  fiches: number;
  remaining: number;
  byStage: Record<DepthStage, number>;
}

export interface AnthroponymDepth {
  fiches: number;
  remaining: number;
  byStage: Record<DepthStage, number>;
  families: FamilyDepth[];
  withoutFamily: FamilyDepth;
}

function emptyTally(familyId: string): FamilyDepth {
  return {
    familyId,
    fiches: 0,
    remaining: 0,
    byStage: {
      "queue-only": 0,
      "unsourced-origin": 0,
      "undeclared-transmission": 0,
      documented: 0,
    },
  };
}

function originClaimCount(dossier: DepthReadableDossier): number {
  const origin = dossier.origin ?? {};
  return (
    (origin.oralTraditions?.length ?? 0) +
    (origin.writtenChronicles?.length ?? 0) +
    (origin.linguisticReconstructions?.length ?? 0)
  );
}

export function classifyDepth(dossier: DepthReadableDossier): DepthStage {
  const sources = dossier.sources ?? [];
  const onlyTheQueue = sources.every(
    (source) => source.source_kind === "ai_generated"
  );

  if (onlyTheQueue) return "queue-only";
  if (originClaimCount(dossier) === 0) return "unsourced-origin";
  if (dossier.transmissionMode === "other") return "undeclared-transmission";
  return "documented";
}

/**
 * Maps every `PPL_*` in the corpus to the linguistic family directory that
 * holds it. Depth waves are ordered by family, so this is what decides which
 * wave a name fiche belongs to — and a fiche whose peoples resolve to nothing
 * belongs to no wave at all.
 */
export function peopleFamilyIndex(datasetRoot: string): Map<string, string> {
  const index = new Map<string, string>();
  const peuples = join(datasetRoot, "peuples");

  for (const entry of readdirSync(peuples, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of readdirSync(join(peuples, entry.name))) {
      if (!file.endsWith(".json")) continue;
      index.set(file.slice(0, -".json".length), entry.name);
    }
  }

  return index;
}

function record(tally: FamilyDepth, stage: DepthStage): void {
  tally.fiches += 1;
  tally.byStage[stage] += 1;
  if (stage !== "documented") tally.remaining += 1;
}

export function summariseAnthroponymDepth(
  dossiers: DepthReadableDossier[],
  familyOfPeople: Map<string, string>
): AnthroponymDepth {
  const corpus = emptyTally("");
  const withoutFamily = emptyTally("");
  const byFamily = new Map<string, FamilyDepth>();

  for (const dossier of dossiers) {
    const stage = classifyDepth(dossier);
    record(corpus, stage);

    const families = new Set(
      (dossier.peoples ?? [])
        .map((association) => familyOfPeople.get(association.peopleId ?? ""))
        .filter((familyId): familyId is string => Boolean(familyId))
    );

    if (families.size === 0) {
      record(withoutFamily, stage);
      continue;
    }

    // A name attested in two families is one fiche and two pieces of wave
    // work, so it counts in both columns — the family rows do not sum to the
    // corpus total, and are not meant to.
    for (const familyId of families) {
      const tally = byFamily.get(familyId) ?? emptyTally(familyId);
      record(tally, stage);
      byFamily.set(familyId, tally);
    }
  }

  const families = [...byFamily.values()].sort(
    (a, b) => b.remaining - a.remaining || a.familyId.localeCompare(b.familyId)
  );

  return {
    fiches: corpus.fiches,
    remaining: corpus.remaining,
    byStage: corpus.byStage,
    families,
    withoutFamily,
  };
}
