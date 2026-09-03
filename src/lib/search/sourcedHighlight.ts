import {
  DID_YOU_KNOW_FACTS,
  type DidYouKnowEntityKind,
  type DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";
import type { SearchEntityType } from "@/types/afrik-frontend";

/**
 * Only the three fact-bank entity kinds have a search counterpart —
 * languages, persons and patronymes are outside the bank's coverage, so a
 * pivot of one of those types never matches.
 */
const SEARCH_TYPE_TO_ENTITY_KIND: Partial<
  Record<SearchEntityType, DidYouKnowEntityKind>
> = {
  country: "country",
  people: "people",
  languageFamily: "family",
};

/**
 * The one fact from the "Saviez-vous" bank that concerns this exact pivot,
 * or none.
 *
 * The block sits between the card and the results to deepen the answer the
 * reader already asked for — a fact about an unrelated entity there would
 * read as noise, not depth. A pivot the bank has nothing to say about hides
 * the block rather than filling it with the nearest fact, the same doctrine
 * the atlas charter applies to any field the corpus does not cover. The
 * first matching fact wins, so the same pivot always highlights the same
 * fact.
 */
// @req REQ-124
export function selectSourcedHighlight(
  pivot: { type: SearchEntityType; id: string },
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact | null {
  const entityKind = SEARCH_TYPE_TO_ENTITY_KIND[pivot.type];
  if (!entityKind) return null;

  return (
    facts.find((fact) =>
      fact.entities.some(
        (entity) => entity.kind === entityKind && entity.id === pivot.id
      )
    ) ?? null
  );
}
