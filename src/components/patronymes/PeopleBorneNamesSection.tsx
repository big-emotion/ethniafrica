import type { PatronymeLinkSummary } from "@/api/v2/services/patronymeFicheLinks";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FicheNameList } from "@/components/patronymes/FicheNameList";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

export interface PeopleBorneNamesSectionProps {
  /**
   * The names the corpus attaches to this people, `null` when the read
   * failed.
   *
   * The two are not the same fact and the chapter does not say they are. An
   * empty array is the corpus speaking — 13 peoples out of some 800 carry a
   * name — and `null` is this page failing to ask it. Collapsing them would
   * print a dropped query as an editorial silence, which on a surface whose
   * whole argument is provenance is the worse of the two failures.
   */
  patronymes: PatronymeLinkSummary[] | null;
  language: Language;
}

/**
 * « Noms portés » — the names this people bears (REQ-133).
 *
 * The reverse of the name fiche's « Peuples porteurs », and the surface a
 * reader most naturally expects: it is what makes the name dimension part of
 * the atlas rather than a separate index.
 *
 * The chapter renders whatever the corpus holds, empty included. That is the
 * atlas charter's §4 rule — an empty field is information about the state of
 * the corpus, and erasing it makes that information disappear — and it is why
 * this is not gated the way `Fragmentation coloniale` is. Fragmentation is
 * absent where it does not apply; a people with no name is a documented
 * silence, not an inapplicable question.
 */
// @req REQ-133
export function PeopleBorneNamesSection({
  patronymes,
  language,
}: PeopleBorneNamesSectionProps) {
  const copy = getTranslation(language).patronymes.onFiche;
  return (
    <FicheSection title={copy.peopleTitle}>
      {patronymes === null ? (
        <FieldProvenanceMarker
          state="documented-gap"
          reason={copy.peopleUnavailable}
          language={language}
        />
      ) : patronymes.length > 0 ? (
        <FicheNameList names={patronymes} language={language} />
      ) : (
        <FieldProvenanceMarker
          state="documented-gap"
          reason={copy.peopleEmpty}
          language={language}
        />
      )}
    </FicheSection>
  );
}
