import type { CountryDetail } from "@/types/afrik-frontend";
import {
  DEMOGRAPHIC_REFERENCE_YEAR,
  transformCountryData,
} from "@/lib/countryDataTransformer";
import { backLinkLabel } from "@/lib/navigation/deriveTrail";
import { getPeopleRoute } from "@/lib/routing";

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
  // The head names the country twice on purpose — the name of ordinary use,
  // then the protocol name under it — but only while they are two different
  // facts. Repeating one word as if it were two overstates what the fiche
  // knows, the same reason the family lede declines to name the autonym and
  // the English name separately when they are the same word.
  const statesTwoNames =
    Boolean(hero.nameOfficial) && hero.nameOfficial !== hero.countryName;

  // The trail is the shell's now (`PageLayout` → `SiteTrail`). The back link
  // below is not a crumb and never was: it states where the reader came from,
  // which the address does not record, so it stays here.
  return (
    <>
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
        {statesTwoNames && (
          <p className="afh-parchment-lede">{hero.nameOfficial}</p>
        )}
      </header>
    </>
  );
}

export default CountryFicheTitle;
