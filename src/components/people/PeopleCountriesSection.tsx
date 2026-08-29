import Link from "next/link";
import type { PeopleCountriesData } from "@/lib/peopleDataTransformer";
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
      {/* Summary row */}
      <div className="flex items-baseline gap-[6px] mb-[14px]">
        <span
          className="text-afh-h1 font-black leading-none tracking-tight"
          style={{
            fontFamily: "var(--country-font-display)",
            color: "var(--country-text)",
          }}
        >
          {data.totalPopulationFormatted}
        </span>
        <span className="text-afh-caption text-[color:var(--country-text-soft)]">
          habitants
          {data.referenceYear && <> · {data.referenceYear}</>}
        </span>
      </div>

      {/* Distribution rows */}
      <div className="space-y-[8px]">
        {data.distributions.map((row, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            <div className="flex items-center gap-[10px]">
              <Link
                href={countryHref(row.country)}
                className="text-afh-caption font-bold font-mono w-[40px] shrink-0 hover:underline"
                style={{ color: "var(--country-terracotta)" }}
              >
                {row.country}
              </Link>

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
        ))}
      </div>

      {data.source && (
        <p
          className="text-afh-eyebrow mt-[10px]"
          style={{ color: "var(--country-text-soft)" }}
        >
          Source : {data.source}
        </p>
      )}
    </div>
  );
}
