import type { HistoricalAffiliationSection } from "@/types/afrik";
import { ficheSourceEntries } from "@/lib/afrik/ficheSourceLabel";
// One sources footer for the three fiches; it lives under country/ for
// historical reasons only and knows nothing about countries.
import { SourcesFooter } from "@/components/country/SourcesFooter";

interface PeopleHistoricalAffiliationBlockProps {
  data?: HistoricalAffiliationSection;
}

/**
 * The historical link to Africa a people carries when it has no defensible
 * linguistic-family affiliation to an African family — Creole-speaking
 * groups, whose language Glottolog classifies under its lexifier, are the
 * worked example (REQ-127, `public/DIRECTIVES-AFRIK.md` §12). Its sources
 * are tiered independently of the fiche's own `sources` array, so they get
 * their own `SourcesFooter` rather than joining the fiche-wide one.
 */
// @req REQ-127
export function PeopleHistoricalAffiliationBlock({
  data,
}: PeopleHistoricalAffiliationBlockProps) {
  if (!data) return null;

  const sources = ficheSourceEntries(data.sources);

  return (
    <div className="afh-prose-fields space-y-[14px]">
      <p className="people-section-body">{data.description}</p>
      {sources.length > 0 && (
        <SourcesFooter sources={sources} variant="parchment" />
      )}
    </div>
  );
}
