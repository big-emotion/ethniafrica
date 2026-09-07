import { Card } from "@/components/ui/card";
import { DID_YOU_KNOW_FACTS } from "@/lib/home/didYouKnowFacts";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { DID_YOU_KNOW_FACTS_EN } from "@/lib/home/didYouKnowFacts.en";
import { DID_YOU_KNOW_TIER_LABEL } from "@/lib/home/didYouKnowPresentation";
import { selectSourcedHighlight } from "@/lib/search/sourcedHighlight";
import type { SearchResult } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

export interface SourcedHighlightBlockProps {
  result: SearchResult;
  language?: Language;
  facts?: DidYouKnowFact[];
}

/**
 * The one sourced editorial fact the results page owes the reader, when the
 * bank has one about the exact entity the search resolved to. Absence hides
 * the block: an unrelated fact between the card and the results would read
 * as noise, not as the depth REQ-124 asks for.
 */
// @req REQ-124
export function SourcedHighlightBlock({
  result,
  language = "fr",
  facts = DID_YOU_KNOW_FACTS,
}: SourcedHighlightBlockProps) {
  const fact = selectSourcedHighlight(result, facts);
  if (!fact) return null;
  const displayFact =
    language === "en" ? (DID_YOU_KNOW_FACTS_EN[fact.id] ?? fact) : fact;
  const tierLabel =
    language === "en"
      ? {
          official: "Official source",
          referenced: "Referenced source",
          unverified: "Unverified source",
        }[displayFact.tier]
      : DID_YOU_KNOW_TIER_LABEL[displayFact.tier];

  return (
    <Card
      data-testid="sourced-highlight-block"
      className="border-l-4 border-l-[var(--accent)] p-afh-md"
    >
      <p className="text-afh-eyebrow font-bold uppercase tracking-[0.11em] text-afh-fg-muted">
        {language === "en" ? "Did you know?" : "Le saviez-vous ?"}
      </p>
      <p className="mt-afh-xs text-afh-body font-semibold text-afh-text">
        {displayFact.headline}
      </p>
      <p
        data-testid="sourced-highlight-tier"
        className="mt-afh-sm text-afh-caption text-afh-fg-muted"
      >
        {tierLabel}
      </p>
    </Card>
  );
}
