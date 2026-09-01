import { Card } from "@/components/ui/card";
import { DID_YOU_KNOW_FACTS } from "@/lib/home/didYouKnowFacts";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { DID_YOU_KNOW_TIER_LABEL } from "@/lib/home/didYouKnowPresentation";
import { selectSourcedHighlight } from "@/lib/search/sourcedHighlight";
import type { SearchResult } from "@/types/afrik-frontend";

export interface SourcedHighlightBlockProps {
  result: SearchResult;
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
  facts = DID_YOU_KNOW_FACTS,
}: SourcedHighlightBlockProps) {
  const fact = selectSourcedHighlight(result, facts);
  if (!fact) return null;

  return (
    <Card
      data-testid="sourced-highlight-block"
      className="border-l-4 border-l-[var(--accent)] p-afh-md"
    >
      <p className="text-afh-eyebrow font-bold uppercase tracking-[0.11em] text-afh-fg-muted">
        Le saviez-vous ?
      </p>
      <p className="mt-afh-xs text-afh-body font-semibold text-afh-text">
        {fact.headline}
      </p>
      <p
        data-testid="sourced-highlight-tier"
        className="mt-afh-sm text-afh-caption text-afh-fg-muted"
      >
        {DID_YOU_KNOW_TIER_LABEL[fact.tier]}
      </p>
    </Card>
  );
}
