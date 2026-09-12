import Link from "next/link";
import type { PeopleCountriesData } from "@/lib/peopleDataTransformer";
import { getAdmin0Name } from "@/lib/atlas/overlays";
import { getCountryRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";

interface PeopleCountriesSectionProps {
  data: PeopleCountriesData;
  language: Language;
  /** When provided, appended to country links so the country breadcrumb can show context. */
  fromPeopleId?: string;
  fromPeopleName?: string;
}

// @req REQ-115
export function PeopleCountriesSection({
  data,
  language,
  fromPeopleId,
  fromPeopleName,
}: PeopleCountriesSectionProps) {
  const copy = peopleCopy[language].countries;
  if (data.distributions.length === 0) return null;

  function countryHref(countryId: string): string {
    const base = getCountryRoute(language, countryId);
    if (!fromPeopleId) return base;
    const params = new URLSearchParams({ fromPeopleId });
    if (fromPeopleName) params.set("fromPeopleName", fromPeopleName);
    return `${base}?${params.toString()}`;
  }

  return (
    <div>
      {/* The headline population belongs to the counted summary. These rows
          carry their own populations and shares. */}

      {/* Distribution rows */}
      <div className="space-y-[8px]">
        {data.distributions.map((row, i) => {
          // The same resolver the globe draws with, so a country the map
          // omits is marked here rather than silently listed as if drawn.
          const countryName = getAdmin0Name(row.country, language);
          const share = row.share?.value ?? row.percentage;
          return (
            <div
              key={i}
              className="flex flex-col gap-[3px]"
              data-off-map={countryName ? undefined : "true"}
            >
              <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 md:grid-cols-[2.75rem_minmax(5rem,1fr)_minmax(3rem,1fr)_auto]">
                <Link
                  href={countryHref(row.country)}
                  // The ISO code is the row's link to the country fiche, so it
                  // owes the 44px target rather than the 40×20 box the code
                  // itself occupies. The column keeps its 44px measure so the
                  // share bars beside it stay aligned down the list.
                  className="text-afh-caption font-bold font-mono w-11 min-h-11 inline-flex items-center hover:underline"
                  style={{ color: "var(--country-terracotta-ink)" }}
                >
                  {row.country}
                </Link>

                {/* The code addresses the fiche; the name is what a reader
                  reads. An off-map country has no French name in the admin-0
                  asset, so its code is all there is — and it is then marked as
                  outside the map rather than left looking like an omission. */}
                <span
                  className="text-afh-caption min-w-0"
                  style={{ color: "var(--country-text)" }}
                >
                  {countryName ?? (
                    <span className="uppercase tracking-wide">
                      {copy.offMap}
                    </span>
                  )}
                </span>

                {/* Progress bar */}
                <div
                  className="col-span-2 h-[6px] rounded-full overflow-hidden md:col-span-1"
                  style={{ background: "var(--country-border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, share ?? 0))}%`,
                      background: "var(--country-terracotta)",
                    }}
                  />
                </div>

                <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1">
                  <span
                    className="text-afh-caption font-semibold"
                    style={{ color: "var(--country-text)" }}
                  >
                    {share != null
                      ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(share)} %`
                      : "—"}
                  </span>
                  {row.share?.provenance === "derived" && (
                    <FieldProvenanceMarker
                      state="derived"
                      origin={copy.derivedShare}
                      language={language}
                    />
                  )}
                  {row.populationFormatted && (
                    <span
                      className="text-afh-caption"
                      style={{ color: "var(--country-text-soft)" }}
                    >
                      {row.populationFormatted}
                    </span>
                  )}
                </div>
              </div>

              {/* Where inside the country. A share says how many; this says
                where — and 1063 of them across 486 fiches were written before
                the strict model declared the field. */}
              {row.note && (
                <p
                  className="text-afh-caption pl-[50px] leading-snug"
                  style={{ color: "var(--country-text-soft)" }}
                >
                  {row.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* The reference year rides with the source rather than with a figure:
          it dates the whole distribution, not any one row. */}
      {(data.source || data.referenceYear) && (
        <p
          className="text-afh-eyebrow mt-[10px]"
          style={{ color: "var(--country-text-soft)" }}
        >
          {data.source ? `${copy.source}: ${data.source}` : copy.sourceMissing}
          {data.referenceYear
            ? ` · ${copy.reference} ${data.referenceYear}`
            : ""}
        </p>
      )}
    </div>
  );
}
