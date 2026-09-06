import type { DidYouKnowIllustration } from "@/lib/home/didYouKnowIllustrations";
import type { LocalizedDidYouKnowFact } from "@/lib/home/didYouKnowLocalization";
import type { Language } from "@/types/shared";

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
  fact: LocalizedDidYouKnowFact;
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
const pending = new Map<Language, Promise<Map<string, AnecdoteCardData>>>();

// @req REQ-113
export function loadAnecdoteCards(
  language: Language = "fr"
): Promise<Map<string, AnecdoteCardData>> {
  const cached = pending.get(language);
  if (cached) return cached;

  const request = Promise.all([
    import("@/lib/home/didYouKnowFacts"),
    import("@/lib/home/didYouKnowIllustrations"),
    import("@/lib/home/didYouKnowLocalization"),
  ]).then(
    ([{ DID_YOU_KNOW_FACTS }, { illustrationFor }, localization]) =>
      new Map(
        DID_YOU_KNOW_FACTS.map((fact) => [
          fact.id,
          {
            fact: localization.localizeDidYouKnowFact(fact, language),
            illustration: localization.localizeDidYouKnowIllustration(
              fact.id,
              illustrationFor(fact.id),
              language
            ),
          },
        ])
      )
  );

  pending.set(language, request);
  return request;
}
