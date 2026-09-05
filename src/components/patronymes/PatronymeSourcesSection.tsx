import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import {
  FicheSection,
  SOURCE_TIER_NOTE,
} from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { PatronymeSourceCitation } from "@/components/patronymes/PatronymeSourceCitation";
import { readGaps, readPatronymeSources } from "@/lib/patronymes/content";
import { resolveChapter } from "@/lib/fieldProvenance";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

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
  language,
}: {
  patronyme: PublicPatronyme;
  language: Language;
}) {
  const t = getTranslation(language).patronymes;
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
        <ul className="afh-sources">
          {sources.map((source) => (
            <li key={source.title} className="afh-source-row">
              {/* The shared citation carries a title, a URL and a standing, and
                  deliberately not the corpus's per-source `notes` — those are a
                  patronyme-fiche field, not part of a citation. So the note
                  stays here, inside the row's own cell. */}
              <span>
                <PatronymeSourceCitation source={source} />
                {source.notes ? (
                  <span className="afh-parchment-note"> {source.notes}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <FieldProvenanceMarker
          state={chapter.state}
          reason={chapter.reason}
          language={language}
        />
      )}
    </FicheSection>
  );
}
