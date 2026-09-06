import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";
import type { Language } from "@/types/shared";

import type { DidYouKnowFact } from "./didYouKnowFacts";
import { DID_YOU_KNOW_FACTS_EN } from "./didYouKnowFacts.en";
import type { DidYouKnowIllustration } from "./didYouKnowIllustrations";
import { DID_YOU_KNOW_ILLUSTRATIONS_EN } from "./didYouKnowIllustrations.en";

export type LocalizedDidYouKnowFact = DidYouKnowFact & {
  translationKind?: TranslationKind;
};

// @req REQ-145
export function localizeDidYouKnowFact(
  fact: DidYouKnowFact,
  language: Language
): LocalizedDidYouKnowFact {
  if (language === "fr") return fact;

  const translation = DID_YOU_KNOW_FACTS_EN[fact.id];
  if (!translation) return fact;
  const { provenance, ...copy } = translation;
  return { id: fact.id, ...copy, translationKind: provenance };
}

// @req REQ-145
export function localizeDidYouKnowIllustration(
  id: string,
  illustration: DidYouKnowIllustration | undefined,
  language: Language
): DidYouKnowIllustration | undefined {
  if (language === "fr" || !illustration) return illustration;

  const translation = DID_YOU_KNOW_ILLUSTRATIONS_EN[id];
  if (!translation || translation.kind !== illustration.kind)
    return illustration;

  return illustration.kind === "picture" && translation.kind === "picture"
    ? { ...illustration, alt: translation.alt }
    : illustration.kind === "plate" && translation.kind === "plate"
      ? {
          ...illustration,
          alt: translation.alt,
          givenBy: translation.givenBy,
        }
      : illustration;
}
