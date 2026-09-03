import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import type { DidYouKnowIllustration } from "@/lib/home/didYouKnowIllustrations";

/**
 * One anecdote as a reading surface needs it: the claim and the picture.
 *
 * The card used to look its own picture up, which meant every surface that
 * rendered a card also imported the whole illustration table. Passing the
 * picture in keeps the card a renderer and lets the caller decide when the
 * table is worth loading — on the server for the opening card, in a deferred
 * chunk for the rest.
 */
export interface AnecdoteCardData {
  fact: DidYouKnowFact;
  illustration?: DidYouKnowIllustration;
}

/**
 * The whole bank, fetched only once the reader has asked for a second card.
 *
 * Both modules are pulled behind a dynamic import so neither lands in the
 * page's first payload. They arrive together because they are read together:
 * a fact without its picture would render a card that reflows a moment later.
 *
 * The result is cached for the life of the page. Turning a card is a press,
 * and a press must not wait on a network round-trip it has already made.
 */
let pending: Promise<Map<string, AnecdoteCardData>> | null = null;

// @req REQ-113
export function loadAnecdoteCards(): Promise<Map<string, AnecdoteCardData>> {
  pending ??= Promise.all([
    import("@/lib/home/didYouKnowFacts"),
    import("@/lib/home/didYouKnowIllustrations"),
  ]).then(
    ([{ DID_YOU_KNOW_FACTS }, { illustrationFor }]) =>
      new Map(
        DID_YOU_KNOW_FACTS.map((fact) => [
          fact.id,
          { fact, illustration: illustrationFor(fact.id) },
        ])
      )
  );

  return pending;
}
