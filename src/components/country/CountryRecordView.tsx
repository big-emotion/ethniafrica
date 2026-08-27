import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { FlagTarget } from "@/components/flags/FlagTarget";
import { CountryParchment } from "@/components/country/CountryParchment";
import {
  HistoryTimeline,
  HistoricalFactsSection,
  LanguagesSection,
  CultureGrid,
} from "@/components/country";
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
 */

export interface CountryRecordViewProps {
  country: CountryDetail;
  hasSourceFlag?: boolean;
  /** Set when the reader arrived from a people fiche, so the trail says so. */
  fromPeopleName?: string;
  fromPeopleId?: string;
  /** Cloudflare Turnstile public site key; without it the flag control is inert. */
  turnstileSiteKey?: string;
}

// @req REQ-115
export function CountryRecordView({
  country,
  hasSourceFlag,
  fromPeopleName,
  fromPeopleId,
  turnstileSiteKey,
}: CountryRecordViewProps) {
  const data = transformCountryData(country);

  const breadcrumbs = [
    ...(fromPeopleId
      ? [
          { label: "Peuples", href: "/fr/peuples" },
          {
            label: fromPeopleName ?? fromPeopleId,
            href: `/fr/peuples/${fromPeopleId}`,
          },
        ]
      : [{ label: "Pays", href: "/fr/pays" }]),
    { label: country.nameFr },
  ];

  return (
    <div data-testid="country-record-view">
      <AfrikBreadcrumbs items={breadcrumbs} />

      <CountryParchment
        data={data}
        country={country}
        hasSourceFlag={hasSourceFlag}
      >
        {data.timeline.items.length > 0 && (
          <section className="afh-parchment-section">
            <h2>Noms à travers l&apos;histoire</h2>
            <p className="afh-parchment-note">content.historicalNames</p>
            <HistoryTimeline data={data.timeline} />
          </section>
        )}

        {data.historicalFacts && (
          <section className="afh-parchment-section">
            <h2>Faits historiques majeurs</h2>
            <p className="afh-parchment-note">content.historicalFacts</p>
            <HistoricalFactsSection data={data.historicalFacts} />
          </section>
        )}

        {data.languages.bubbles.length > 0 && (
          <section className="afh-parchment-section">
            <h2>Langues</h2>
            <p className="afh-parchment-note">content.culture.mainLanguages</p>
            <LanguagesSection data={data.languages} />
          </section>
        )}

        <section className="afh-parchment-section">
          <h2>Culture et société</h2>
          <p className="afh-parchment-note">content.culture</p>
          <CultureGrid data={data.culture} />
          <div data-testid="section-flag-target-culture" className="mt-3">
            {turnstileSiteKey ? (
              <FlagTarget
                target={{
                  type: "fiche_section",
                  id: country.id,
                  fieldPath: "culture",
                }}
                turnstileSiteKey={turnstileSiteKey}
                triggerLabel="Signaler cette section"
                className="w-auto text-xs"
              />
            ) : (
              <button
                type="button"
                disabled
                className="rounded-md border border-dashed px-2 py-1 text-xs"
                style={{
                  borderColor: "var(--afh-border)",
                  color: "var(--afh-text-soft)",
                }}
                aria-label="Signaler cette section — bientôt disponible"
              >
                Signaler cette section (bientôt disponible)
              </button>
            )}
          </div>
        </section>
      </CountryParchment>
    </div>
  );
}
