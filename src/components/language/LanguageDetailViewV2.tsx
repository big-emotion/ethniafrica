import type { ReactNode } from "react";

import { DossierLinks } from "@/components/dossiers/DossierLinks";
import Link from "next/link";

import type { LanguagePageData } from "@/lib/languageDataTransformer";
import { getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FicheSources } from "@/components/fiche/FicheSources";
import type { Language } from "@/types/shared";
import { languageFicheCopy } from "@/lib/i18n/copy/languageFiche";
import { ficheCopy } from "@/lib/i18n/copy/fiche";

export interface LanguageDetailViewV2Props {
  data: LanguagePageData;
  language: Language;
  /** An open flag on this fiche's sourcing, resolved by the route. */
  hasSourceFlag?: boolean;
  /**
   * The way out of the fiche — `FicheOnward`, composed by the route.
   *
   * A node rather than the links themselves: resolving them here would make
   * this parchment async, and an async node in the fiche tree resolves every
   * synchronous render of it to an empty div. See `FicheJsonLd`.
   */
  onward?: ReactNode;
}

/**
 * The language fiche's parchment — the reading the reader arrives at from
 * the family or the people it belongs to (ETNI-1507).
 *
 * `LanguageDetail` (REQ-136) is thinner than a people or country fiche: it
 * declares a family, the peoples who speak it, a vehicular role and a
 * vitality status. Every one of those the corpus may leave unfilled carries
 * `FieldProvenanceMarker` rather than an omitted section, exactly the rule
 * the people and family fiches already apply (charter §4) — AC2 asks this
 * specifically of vitality, but the same silence about a vehicular role or
 * an unlisted set of speakers is just as much a fact about the corpus.
 *
 * The family, by contrast, is a foreign key the loader never leaves null, so
 * it renders as a plain link with no missing state to represent.
 */
// @req REQ-136
export function LanguageDetailViewV2({
  data,
  language,
  hasSourceFlag = false,
  onward,
}: LanguageDetailViewV2Props) {
  const copy = languageFicheCopy[language];
  // Defensive against a payload cached before these fields existed: the
  // segment revalidates hourly, so a stale ISR body outlives a deploy.
  const attestedNames = [
    ...(data.nameEn && data.nameEn !== data.name ? [data.nameEn] : []),
    ...(data.alternateNames ?? []),
    ...(data.spellingAliases ?? []),
  ];
  const dialects = data.dialects ?? [];

  return (
    <div className="afh-parchment" id="fiche">
      <FicheSection title={copy.identifiers}>
        <dl className="afh-pairs">
          <dt>ISO 639-3</dt>
          <dd>{data.isoCode639_3}</dd>
          <dt>Glottocode</dt>
          <dd>
            {data.glottocode ?? (
              <FieldProvenanceMarker state="missing" language={language} />
            )}
          </dd>
        </dl>
      </FicheSection>

      <FicheSection title={copy.otherAttestedNames}>
        {attestedNames.length > 0 ? (
          <ul className="afh-rank">
            {attestedNames.map((form) => (
              <li key={form}>{form}</li>
            ))}
          </ul>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
        <DossierLinks
          language={language}
          kind="language"
          id={data.id}
          section="appellations"
        />
      </FicheSection>

      <FicheSection title={copy.languageFamily}>
        <Link
          href={getFamilyRoute(language, data.family.id)}
          className="font-semibold hover:underline"
        >
          {data.family.name}
        </Link>
      </FicheSection>

      <FicheSection title={copy.speakers}>
        {data.speakingPeoples.length > 0 ? (
          <ul className="afh-rank">
            {data.speakingPeoples.map((people) => (
              <li key={people.id}>
                <Link
                  href={getPeopleRoute(language, people.id)}
                  className="hover:underline"
                >
                  {people.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      <FicheSection title={copy.dialects}>
        {dialects.length > 0 ? (
          <ul className="afh-rank">
            {dialects.map((dialect) => (
              <li key={dialect}>{dialect}</li>
            ))}
          </ul>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      <FicheSection title={copy.vehicularRole}>
        {data.vehicularRole ? (
          <p>{data.vehicularRole}</p>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      <FicheSection title={copy.vitality}>
        {data.vitalityStatus ? (
          <p>
            {data.vitalityStatus.status} ({data.vitalityStatus.scale},{" "}
            {data.vitalityStatus.asOf})
          </p>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      {/* Before the bibliography, not after it: the reader this block exists
          for is the one who finished the reading, and almost none of them
          scroll past a source list to find out what to read next. */}
      {onward}

      <FicheSection
        title={copy.sources}
        note={ficheCopy[language].sourceTierNote}
        as="footer"
        id="sources"
      >
        {data.sources.length > 0 ? (
          <FicheSources
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>
    </div>
  );
}
