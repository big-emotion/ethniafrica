import Link from "next/link";
import type { PeopleCountriesData } from "@/lib/peopleDataTransformer";
import { getAdmin0NameFr } from "@/lib/atlas/overlays";
import { getCountryRoute } from "@/lib/routing";

interface PeopleCountriesSectionProps {
  data: PeopleCountriesData;
  /** When provided, appended to country links so the country breadcrumb can show context. */
  fromPeopleId?: string;
  fromPeopleName?: string;
}

// @req REQ-115
export function PeopleCountriesSection({
  data,
  fromPeopleId,
  fromPeopleName,
}: PeopleCountriesSectionProps) {
  if (data.distributions.length === 0) return null;

  function countryHref(countryId: string): string {
    const base = getCountryRoute("fr", countryId);
    if (!fromPeopleId) return base;
    const params = new URLSearchParams({ fromPeopleId });
    if (fromPeopleName) params.set("fromPeopleName", fromPeopleName);
    return `${base}?${params.toString()}`;
  }

  return (
    <div>
      {/* No headline population here. The fiche head states it above the globe
          — "N personnes · réf. Y" — and a second one in the display face read
          as a competing headline for the same figure. The rows carry their
          own. */}

      {/* Distribution rows */}
      <div className="space-y-[8px]">
        {data.distributions.map((row, i) => {
          // The same resolver the globe draws with, so a country the map
          // omits is marked here rather than silently listed as if drawn.
          const nameFr = getAdmin0NameFr(row.country);
          return (
            <div
              key={i}
              className="flex flex-col gap-[3px]"
              data-off-map={nameFr ? undefined : "true"}
            >
              <div className="flex items-center gap-[10px]">
                <Link
                  href={countryHref(row.country)}
                  // The ISO code is the row's link to the country fiche, so it
                  // owes the 44px target rather than the 40×20 box the code
                  // itself occupies. The column keeps its 44px measure so the
                  // share bars beside it stay aligned down the list.
                  className="text-afh-caption font-bold font-mono w-11 min-h-11 inline-flex items-center shrink-0 hover:underline"
                  style={{ color: "var(--country-terracotta-ink)" }}
                >
                  {row.country}
                </Link>

                {/* The code addresses the fiche; the name is what a reader
                  reads. An off-map country has no French name in the admin-0
                  asset, so its code is all there is — and it is then marked as
                  outside the map rather than left looking like an omission. */}
                <span
                  className="text-afh-caption shrink-0"
                  style={{ color: "var(--country-text)" }}
                >
                  {nameFr ?? (
                    <span className="uppercase tracking-wide">hors carte</span>
                  )}
                </span>

                {/* Progress bar */}
                <div
                  className="flex-1 h-[6px] rounded-full overflow-hidden"
                  style={{ background: "var(--country-border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.percentage ?? 0}%`,
                      background: "var(--country-terracotta)",
                    }}
                  />
                </div>

                <div className="flex items-center gap-[6px] shrink-0">
                  <span
                    className="text-afh-caption font-semibold"
                    style={{ color: "var(--country-text)" }}
                  >
                    {row.percentage != null ? `${row.percentage}%` : "—"}
                  </span>
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
          {data.source ? `Source : ${data.source}` : "Source non renseignée"}
          {data.referenceYear ? ` · réf. ${data.referenceYear}` : ""}
        </p>
      )}
    </div>
  );
}
