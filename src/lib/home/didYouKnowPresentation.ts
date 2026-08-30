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

/** Which half of the anecdote band the picture takes, once it has halves. */
export type AnecdoteImageSide = "start" | "end";

/**
 * Toss for the side the opening anecdote's picture takes.
 *
 * It lives here rather than in the page because the toss has to happen on the
 * server — a client draw would flip the band a frame after paint — and React
 * refuses an impure call during render. Passing the source of randomness in
 * is what makes the toss testable at all.
 */
// @req REQ-113
export function drawAnecdoteImageSide(
  random: () => number = Math.random
): AnecdoteImageSide {
  return random() < 0.5 ? "start" : "end";
}

// @req REQ-113
export const DID_YOU_KNOW_TIER_LABEL = {
  official: "Source officielle",
  referenced: "Source référencée",
  unverified: "Source non vérifiée",
} as const;
