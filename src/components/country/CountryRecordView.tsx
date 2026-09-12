import type { ReactNode } from "react";

import { DossierLinks } from "@/components/dossiers/DossierLinks";
import { FlagTarget } from "@/components/flags/FlagTarget";
import { CountryParchment } from "@/components/country/CountryParchment";
import { FicheTileChapter } from "@/components/fiche/FicheTileChapter";
import { countryCultureTiles } from "@/lib/fiche/culture";
import { FicheSection as Section } from "@/components/fiche/FicheSection";
import { FicheNamesChapter } from "@/components/fiche/FicheNamesChapter";
import { transformCountryData } from "@/lib/countryDataTransformer";
import type { CountryLanguagesFact } from "@/lib/countryLanguagesFact";
import type { CountrySummaryFigures } from "@/components/fiche/FicheSummaryBrief";
import type { CountryPatronymes } from "@/api/v2/services/patronymeFicheLinks";
import type { CountryDetail } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";
import { countryCopy } from "@/lib/i18n/copy/country";

/** The country record binds server data to the ordered parchment chapters. */

export interface CountryRecordViewProps {
  country: CountryDetail;
  language: Language;
  hasSourceFlag?: boolean;
  /**
   * Set when the reader arrived from a people fiche. Provenance, not
   * ancestry: it buys a way back, never a crumb — the same country reached
   * from the hub is the same page and gets the same trail.
   */
  fromPeopleName?: string;
  fromPeopleId?: string;
  /**
   * The country's two name lists (REQ-133), resolved by the route. `null`
   * says the read failed; two empty lists say the corpus reaches no name
   * here, which the chapter states rather than hides.
   */
  patronymes?: CountryPatronymes | null;
  summaryFigures?: CountrySummaryFigures;
  /** Null means the derived-language read failed, not that the corpus is empty. */
  countryLanguages?: CountryLanguagesFact | null;
  /** The way out of the fiche, composed by the route and passed straight down. */
  onward?: ReactNode;
  /** Cloudflare Turnstile public site key; without it the flag control is inert. */
}

// @req REQ-115
export function CountryRecordView({
  country,
  language,
  hasSourceFlag,
  patronymes = null,
  summaryFigures,
  countryLanguages,
  onward,
}: CountryRecordViewProps) {
  const copy = countryCopy[language];
  const data = transformCountryData(country, language);

  return (
    <div data-testid="country-record-view">
      <CountryParchment
        data={data}
        country={country}
        language={language}
        hasSourceFlag={hasSourceFlag}
        summaryFigures={summaryFigures}
        languagesState={
          countryLanguages === null
            ? "unavailable"
            : countryLanguages?.provenance
        }
        languages={countryLanguages?.value}
        onward={onward}
      >
        {/* After the languages, not beside "Noms à travers l'histoire": that
            chapter and "Étymologie du nom" are about what the *country* has
            been called, and this one about the names its inhabitants bear.
            Adjacent, three chapters opening on "Nom" would read as a menu of
            one subject rather than three claims. Spoken here, then named
            here, then the rest of the culture. */}
        <FicheNamesChapter
          scope="country"
          patronymes={patronymes}
          language={language}
        />

        <Section title={copy.sections.culture}>
          <FicheTileChapter
            tiles={countryCultureTiles(country.culture, language)}
            language={language}
          />
          <DossierLinks
            kind="country"
            id={country.id}
            section="culture"
            language={language}
          />
          <div data-testid="section-flag-target-culture" className="mt-3">
            <FlagTarget
              language={language}
              target={{
                type: "fiche_section",
                id: country.id,
                fieldPath: "culture",
              }}
              triggerLabel={copy.reportSection}
              className="w-auto text-afh-caption"
            />
          </div>
        </Section>
      </CountryParchment>
    </div>
  );
}
