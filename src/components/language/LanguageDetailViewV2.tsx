import Link from "next/link";

import type { LanguagePageData } from "@/lib/languageDataTransformer";
import { getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import {
  FicheSection,
  SOURCE_TIER_NOTE,
} from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { SourcesFooter } from "@/components/country/SourcesFooter";

export interface LanguageDetailViewV2Props {
  data: LanguagePageData;
  /** An open flag on this fiche's sourcing, resolved by the route. */
  hasSourceFlag?: boolean;
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
  hasSourceFlag = false,
}: LanguageDetailViewV2Props) {
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
      <FicheSection title="Identifiants">
        <dl className="afh-pairs">
          <dt>ISO 639-3</dt>
          <dd>{data.isoCode639_3}</dd>
          <dt>Glottocode</dt>
          <dd>
            {data.glottocode ?? <FieldProvenanceMarker state="missing" />}
          </dd>
        </dl>
      </FicheSection>

      <FicheSection title="Autres noms attestés">
        {attestedNames.length > 0 ? (
          <ul className="afh-rank">
            {attestedNames.map((form) => (
              <li key={form}>{form}</li>
            ))}
          </ul>
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </FicheSection>

      <FicheSection title="Famille linguistique">
        <Link
          href={getFamilyRoute("fr", data.family.id)}
          className="font-semibold hover:underline"
        >
          {data.family.name}
        </Link>
      </FicheSection>

      <FicheSection title="Locuteurs">
        {data.speakingPeoples.length > 0 ? (
          <ul className="afh-rank">
            {data.speakingPeoples.map((people) => (
              <li key={people.id}>
                <Link
                  href={getPeopleRoute("fr", people.id)}
                  className="hover:underline"
                >
                  {people.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </FicheSection>

      <FicheSection title="Dialectes">
        {dialects.length > 0 ? (
          <ul className="afh-rank">
            {dialects.map((dialect) => (
              <li key={dialect}>{dialect}</li>
            ))}
          </ul>
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </FicheSection>

      <FicheSection title="Rôle véhiculaire">
        {data.vehicularRole ? (
          <p>{data.vehicularRole}</p>
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </FicheSection>

      <FicheSection title="Vitalité">
        {data.vitalityStatus ? (
          <p>
            {data.vitalityStatus.status} ({data.vitalityStatus.scale},{" "}
            {data.vitalityStatus.asOf})
          </p>
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </FicheSection>

      <FicheSection
        title="Sources"
        note={SOURCE_TIER_NOTE}
        as="footer"
        id="sources"
      >
        {data.sources.length > 0 ? (
          <SourcesFooter
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            variant="parchment"
          />
        ) : (
          <FieldProvenanceMarker state="missing" />
        )}
      </FicheSection>
    </div>
  );
}

export default LanguageDetailViewV2;
