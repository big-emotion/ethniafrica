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

  /**
   * REQ-155: the sentence used to print once per row, identically, because
   * the component never asked whether the rows agreed on where their share
   * came from. Rows can legitimately differ — a fiche may declare some
   * shares and derive others — so the chapter states it once only when every
   * row's share carries the same provenance; otherwise each row keeps its
   * own marker.
   */
  const shareProvenances = data.distributions.map(
    (row) => row.share?.provenance
  );
  const hoistedProvenance =
    shareProvenances[0] === "derived" &&
    shareProvenances.every((p) => p === shareProvenances[0]);

  return (
    <div>
      {/* The headline population belongs to the counted summary. These rows
          carry their own populations and shares. */}
      {hoistedProvenance && (
        <FieldProvenanceMarker
          state="derived"
          origin={copy.derivedShare}
          language={language}
          className="mb-2"
        />
      )}

      {/* Distribution rows: identifier, name (with its population and note
          beneath it), share — a compact three-column grid, the progress
          track spanning beneath so five countries fit one 430px screen. */}
      <div className="space-y-3">
        {data.distributions.map((row, i) => {
          // The same resolver the globe draws with, so a country the map
          // omits is marked here rather than silently listed as if drawn.
          const countryName = getAdmin0Name(row.country, language);
          const share = row.share?.value ?? row.percentage;
          const showRowProvenance =
            !hoistedProvenance && row.share?.provenance === "derived";
          return (
            <div
              key={i}
              data-country-row={row.country}
              className="grid grid-cols-[2.75rem_1fr_auto] items-start gap-x-2 gap-y-1"
              data-off-map={countryName ? undefined : "true"}
            >
              <Link
                href={countryHref(row.country)}
                // The ISO code is the row's link to the country fiche, so it
                // owes the 44px target rather than the 40×20 box the code
                // itself occupies.
                className="text-afh-caption font-bold font-mono w-11 min-h-11 inline-flex items-center hover:underline"
                style={{ color: "var(--people-accent-ink)" }}
              >
                {row.country}
              </Link>

              {/* The code addresses the fiche; the name is what a reader
                  reads, with its own population and note beneath it. An
                  off-map country has no French name in the admin-0 asset, so
                  its code is all there is — and it is then marked as outside
                  the map rather than left looking like an omission. */}
              <div className="min-w-0">
                <div
                  className="text-afh-caption"
                  style={{ color: "var(--country-text)" }}
                >
                  {countryName ?? (
                    <span className="uppercase tracking-wide">
                      {copy.offMap}
                    </span>
                  )}
                </div>
                {(row.populationFormatted || row.note) && (
                  <div
                    className="flex flex-wrap items-baseline gap-x-2 text-afh-caption"
                    style={{ color: "var(--country-text-soft)" }}
                  >
                    {row.populationFormatted && (
                      <span>{row.populationFormatted}</span>
                    )}
                    {row.note && <span>{row.note}</span>}
                  </div>
                )}
              </div>

              <div className="text-right">
                <span
                  className="people-country-share"
                  style={{ color: "var(--country-text)" }}
                >
                  {share != null
                    ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(share)} %`
                    : "—"}
                </span>
                {showRowProvenance && (
                  <FieldProvenanceMarker
                    state="derived"
                    origin={copy.derivedShare}
                    language={language}
                    className="mt-1 block"
                  />
                )}
              </div>

              {/* The track spans the full row, beneath the three cells. */}
              <div
                className="col-span-3 h-[6px] rounded-full overflow-hidden"
                style={{ background: "var(--country-border)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, share ?? 0))}%`,
                    background: "var(--people-accent)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* `demography.source` is a research note, not a citation — on some
          fiches it names Wikipedia, which the source policy does not accept
          as a source at all. It is never printed to the reader; only the
          reference year, which dates the whole distribution rather than any
          one claim, may stay. */}
      {data.referenceYear && (
        <p
          className="text-afh-eyebrow mt-[10px]"
          style={{ color: "var(--country-text-soft)" }}
        >
          {copy.reference} {data.referenceYear}
        </p>
      )}

      <style>{`
        .people-country-share {
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-body);
          /* 700, not 600: Fraunces loads only 300/500/700/900
             (app/layout.tsx), so a 600 request would silently resolve to 700
             anyway — this states what actually renders. */
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
