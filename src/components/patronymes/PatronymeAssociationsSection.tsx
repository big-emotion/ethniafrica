import Link from "next/link";

import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { FicheSection } from "@/components/fiche/FicheSection";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * AC4 — a non-hereditary patronymic works differently by region, so the
 * fiche says so explicitly, and offers the peoples and countries the term
 * reaches rather than leave the reader to infer a footprint from silence.
 */
// @req REQ-133
export function PatronymeAssociationsSection({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  const { associatedPeoples, associatedCountries, nameSystem } = patronyme;
  const isNonHereditary = nameSystem === "non_hereditary_patronymic";
  const isEmpty =
    associatedPeoples.length === 0 && associatedCountries.length === 0;

  return (
    <FicheSection title={t.associationsTitle}>
      {isNonHereditary ? (
        <p className="afh-parchment-note">{t.nonHereditaryGuidance}</p>
      ) : null}
      {isEmpty ? (
        <p>{t.associationsEmpty}</p>
      ) : (
        <>
          {associatedPeoples.length > 0 ? (
            <div>
              <h3>{t.associatedPeoplesLabel}</h3>
              <ul>
                {associatedPeoples.map((people) => (
                  <li key={people.id}>
                    <Link href={getPeopleRoute("fr", people.id)}>
                      {people.nameMain}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {associatedCountries.length > 0 ? (
            <div>
              <h3>{t.associatedCountriesLabel}</h3>
              <ul>
                {associatedCountries.map((country) => (
                  <li key={country.id}>
                    <Link href={getCountryRoute("fr", country.id)}>
                      {country.nameFr}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </FicheSection>
  );
}
