import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import {
  FicheSection,
  SOURCE_TIER_NOTE,
} from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { PatronymeSourceCitation } from "@/components/patronymes/PatronymeSourceCitation";
import { readGaps, readPatronymeSources } from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * What the fiche rests on.
 *
 * Filled on all 30 dossiers and exposed by the serializer, but the view had
 * no Sources section at all — so a name fiche published no `#sources` anchor,
 * which is the target every confidence chip and citation link in the app
 * points at. The anchor is as much the point of this section as the list is.
 *
 * The id and the tier note match the other four fiches deliberately: one
 * rendering of the Source Tier Policy across the whole atlas, not a fifth.
 */
// @req REQ-133
export function PatronymeSourcesSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const sources = readPatronymeSources(patronyme.content);
  const chapter = resolveChapter(
    "name",
    "sources",
    sources,
    readGaps(patronyme.content)
  );

  return (
    <FicheSection
      title={t.sourcesTitle}
      note={SOURCE_TIER_NOTE}
      as="footer"
      id="sources"
    >
      {sources.length > 0 ? (
        <ul>
          {sources.map((source) => (
            <li key={source.title}>
              <PatronymeSourceCitation source={source} />
              {source.notes ? (
                <span className="afh-parchment-note"> {source.notes}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <FieldProvenanceMarker state={chapter.state} reason={chapter.reason} />
      )}
    </FicheSection>
  );
}

export default PatronymeSourcesSection;
