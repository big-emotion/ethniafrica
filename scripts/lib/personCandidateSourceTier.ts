import type { SourceTier } from "../../src/types/sources";
import type { FicheSource, PersonCandidate } from "./personCandidateTypes";

type PersonSourceResolution = Pick<
  PersonCandidate,
  | "sourceCandidates"
  | "inheritedTier"
  | "sourceKind"
  | "tierResolution"
  | "reviewFlags"
>;

const SOURCE_TIERS: readonly SourceTier[] = [
  "official",
  "referenced",
  "unverified",
];

const REVIEW_FLAGS = ["source_tier_unresolved", "source_review_required"];

function isSourceTier(tier: unknown): tier is SourceTier {
  return SOURCE_TIERS.includes(tier as SourceTier);
}

function isWikipediaSource(source: FicheSource): boolean {
  return (
    /\bwikipedia\b/i.test(source.title) ||
    /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?wikipedia\.org(?:[/:?#]|$)/i.test(
      source.url ?? ""
    )
  );
}

function reviewRequired(
  sourceCandidates: FicheSource[]
): PersonSourceResolution {
  return {
    sourceCandidates: [...sourceCandidates],
    inheritedTier: null,
    sourceKind: null,
    tierResolution: "review_required",
    reviewFlags: [...REVIEW_FLAGS],
  };
}

/**
 * Resolves provenance only when sources are explicitly bound to the passage.
 * Fiche-level sources cannot identify which citation supports which prose —
 * the tier inherited here is always a real SourceTier value the fiche
 * already carries, never the ai_generated source_kind (REQ-126).
 */
export function resolvePersonSourceTier(
  ficheSources: FicheSource[],
  passageBoundSources?: FicheSource[]
): PersonSourceResolution {
  if (!passageBoundSources?.length) {
    return reviewRequired(ficheSources);
  }

  if (passageBoundSources.every(isWikipediaSource)) {
    return reviewRequired(passageBoundSources);
  }

  const inheritedTier = passageBoundSources[0].tier;
  if (
    !isSourceTier(inheritedTier) ||
    passageBoundSources.some((source) => source.tier !== inheritedTier)
  ) {
    return reviewRequired(passageBoundSources);
  }

  const sourceKind = passageBoundSources[0].source_kind ?? null;
  if (
    passageBoundSources.some(
      (source) => (source.source_kind ?? null) !== sourceKind
    )
  ) {
    return reviewRequired(passageBoundSources);
  }

  return {
    sourceCandidates: [...passageBoundSources],
    inheritedTier,
    sourceKind,
    tierResolution:
      passageBoundSources.length === 1
        ? "single_source"
        : "uniform_bound_sources",
    reviewFlags: [],
  };
}
