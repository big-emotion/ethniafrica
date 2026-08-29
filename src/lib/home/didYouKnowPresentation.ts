import type { DidYouKnowEntityKind } from "@/lib/home/didYouKnowFacts";

/**
 * How a "Saviez-vous" fact is dressed, kept apart from the two surfaces that
 * dress it.
 *
 * The home band and the loading interstitial show the same fact in two places
 * a reader may well see within the same minute. If each held its own copy of
 * these maps, a country chip could end up teal in one and terre in the other,
 * and the reader would have no way of knowing the two are the same claim.
 */

// @req REQ-113
export const DID_YOU_KNOW_ENTITY_LABEL: Record<DidYouKnowEntityKind, string> = {
  people: "Peuple",
  country: "Pays",
  family: "Famille linguistique",
};

// Atlas-charter §2: people ocre, country teal, family terre. Three
// destinations must not look like one list.
// @req REQ-113
export const DID_YOU_KNOW_ENTITY_ACCENT: Record<DidYouKnowEntityKind, string> =
  {
    people: "afh-accent-ocre",
    country: "afh-accent-teal",
    family: "afh-accent-terre",
  };

// @req REQ-113
export const DID_YOU_KNOW_TIER_LABEL = {
  official: "Source officielle",
  referenced: "Source référencée",
  unverified: "Source non vérifiée",
} as const;
