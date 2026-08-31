import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import { FlagTarget } from "@/components/flags/FlagTarget";
import { CountryParchment } from "@/components/country/CountryParchment";
import {
  HistoryTimeline,
  HistoricalFactsSection,
  LanguagesSection,
  CultureGrid,
} from "@/components/country";
import { FicheSection as Section } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { transformCountryData } from "@/lib/countryDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";

/**
 * The country fiche's dossier, server-rendered.
 *
 * `CountryDetailViewV2` fetched its own fiche from the browser even though the
 * route had already awaited it, and laid the sections out as rounded cards —
 * the shape this page shipped with before the atlas charter existed. This is
 * its counterpart on the parchment, fed by the route, the way
 * `LanguageFamilyDetailViewV2` and `PeopleDetailViewV2` already are.
 *
 * The mockup frames four sections. The other four are out of frame, not
 * removed: it models the fiche's opening argument, not its whole contents, and
 * "the mockup does not draw it" is no reason to drop shipped, sourced content —
 * least of all the culture section's FlagTarget, which a requirement asks for.
 *
 * Those four were hand-rolled `<section class="afh-parchment-section">` blocks
 * with their own heading and note. They now go through `FicheSection` like
 * every other chapter of every other fiche, which is what puts them under
 * `data-fiche-section` — and therefore in reach of a contract test. One of them
 * carried a provenance note naming a JSON path for as long as it did precisely
 * because nothing could see it.
 */

export interface CountryRecordViewProps {
  country: CountryDetail;
  hasSourceFlag?: boolean;
  /**
   * Set when the reader arrived from a people fiche. Provenance, not
   * ancestry: it buys a way back, never a crumb — the same country reached
   * from the hub is the same page and gets the same trail.
   */
  fromPeopleName?: string;
  fromPeopleId?: string;
  /** Cloudflare Turnstile public site key; without it the flag control is inert. */
}

// @req REQ-115
export function CountryRecordView({
  country,
  hasSourceFlag,
  fromPeopleName,
  fromPeopleId,
}: CountryRecordViewProps) {
  const data = transformCountryData(country);

  return (
    <div data-testid="country-record-view">
      <CountryParchment
        data={data}
        country={country}
        hasSourceFlag={hasSourceFlag}
      >
        <Section title="Noms à travers l'histoire">
          {data.timeline.items.length > 0 ? (
            <HistoryTimeline data={data.timeline} />
          ) : (
            <FieldProvenanceMarker state="missing" />
          )}
        </Section>

        <Section title="Faits historiques majeurs">
          {data.historicalFacts ? (
            <HistoricalFactsSection data={data.historicalFacts} />
          ) : (
            <FieldProvenanceMarker state="missing" />
          )}
        </Section>

        <Section title="Langues">
          {data.languages.bubbles.length > 0 ? (
            <LanguagesSection data={data.languages} />
          ) : (
            <FieldProvenanceMarker state="missing" />
          )}
        </Section>

        <Section title="Culture et société">
          <CultureGrid data={data.culture} />
          <div data-testid="section-flag-target-culture" className="mt-3">
            <FlagTarget
              target={{
                type: "fiche_section",
                id: country.id,
                fieldPath: "culture",
              }}
              triggerLabel="Signaler cette section"
              className="w-auto text-afh-caption"
            />
          </div>
        </Section>
      </CountryParchment>
    </div>
  );
}
