import type { CountryDetail } from "@/types/afrik-frontend";
import {
  DEMOGRAPHIC_REFERENCE_YEAR,
  transformCountryData,
} from "@/lib/countryDataTransformer";
import { backLinkLabel } from "@/lib/navigation/deriveTrail";
import { getPeopleRoute, getStaticPageRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { countryCopy } from "@/lib/i18n/copy/country";
import { ficheCopy } from "@/lib/i18n/copy/fiche";

/**
 * The band a country fiche opens on, above the globe.
 *
 * Same move as the people fiche: the head used to sit inside the parchment,
 * below a full-bleed band, so a reader arriving on `/fr/atlas/pays/BEN`
 * met a globe and nothing naming the page. The figures stay with the
 * parchment; the band carries the identity and the way back.
 */
// @req REQ-091
export function CountryFicheTitle({
  country,
  language,
  fromPeopleId,
  fromPeopleName,
}: {
  country: CountryDetail;
  language: Language;
  /** The people fiche a reader arrived from. Provenance, never ancestry. */
  fromPeopleId?: string;
  fromPeopleName?: string;
}) {
  const copy = countryCopy[language].title;
  const { hero } = transformCountryData(country, language);
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
            href={getPeopleRoute(language, fromPeopleId)}
            data-testid="country-back-to-people"
            className="hover:underline"
          >
            ‹ {backLinkLabel(language, fromPeopleName ?? fromPeopleId)}
          </a>
        </p>
      )}

      <header className="afh-parchment-head">
        <p className="afh-parchment-eyebrow">
          {hero.iso} · {copy.ficheCountry}
          {hasPeoples && ` · ${copy.reference} ${DEMOGRAPHIC_REFERENCE_YEAR}`}
        </p>
        {/* The invitation stands with the name of the page rather than only at
            the foot of it. A reader decides a record is thin in the first
            screen, which is also the screen where the way to fill it was
            missing. Below the names on a phone, beside them from the tablet
            floor up: the head's composition is a centred title, and a control
            pulled up next to it would take that centring away. */}
        <div className="afh-parchment-head-title">
          <div className="min-w-0">
            <h1>{hero.countryName}</h1>
            {statesTwoNames && (
              <p className="afh-parchment-lede">{hero.nameOfficial}</p>
            )}
          </div>
          <a
            className="afh-parchment-contribute"
            data-testid="country-contribute"
            href={getStaticPageRoute(language, "contribute")}
          >
            {ficheCopy[language].contribute}
          </a>
        </div>
      </header>
    </>
  );
}
