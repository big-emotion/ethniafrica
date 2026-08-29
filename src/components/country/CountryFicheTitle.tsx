import type { CountryDetail } from "@/types/afrik-frontend";
import { transformCountryData } from "@/lib/countryDataTransformer";
import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { backLinkLabel, deriveTrail } from "@/lib/navigation/deriveTrail";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";

/** The reference year every fiche's shares are read against — see CountryParchment. */
const DEMOGRAPHIC_REFERENCE_YEAR = 2025;

/**
 * The band a country fiche opens on, above the globe.
 *
 * Same move as the people fiche: the head used to sit inside the parchment,
 * below a full-bleed band, so a reader arriving on `/fr/explorer/pays/BEN`
 * met a globe and nothing naming the page. The figures stay with the
 * parchment; the band carries the identity and the way back.
 */
// @req REQ-091
export function CountryFicheTitle({
  country,
  fromPeopleId,
  fromPeopleName,
}: {
  country: CountryDetail;
  /** The people fiche a reader arrived from. Provenance, never ancestry. */
  fromPeopleId?: string;
  fromPeopleName?: string;
}) {
  const { hero } = transformCountryData(country);
  const hasPeoples = (country.demographics?.peoples?.length ?? 0) > 0;

  return (
    <>
      <AfrikBreadcrumbs
        items={deriveTrail(getCountryRoute("fr", country.id), country.nameFr)}
      />

      {fromPeopleId && (
        <p className="px-3 md:px-4 xl:px-5 text-afh-caption">
          <a
            href={getPeopleRoute("fr", fromPeopleId)}
            data-testid="country-back-to-people"
            className="hover:underline"
          >
            ‹ {backLinkLabel(fromPeopleName ?? fromPeopleId)}
          </a>
        </p>
      )}

      <header className="afh-parchment-head">
        <p className="afh-parchment-eyebrow">
          {hero.iso} · fiche pays
          {hasPeoples && ` · réf. ${DEMOGRAPHIC_REFERENCE_YEAR}`}
        </p>
        <h1>{hero.countryName}</h1>
        {hero.nameOfficial && (
          <p className="afh-parchment-lede">{hero.nameOfficial}</p>
        )}
      </header>
    </>
  );
}

export default CountryFicheTitle;
