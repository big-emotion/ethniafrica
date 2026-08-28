import Link from "next/link";
import type { PeoplesData, PeopleRow } from "@/lib/countryDataTransformer";
import { AutonymExonymHeading } from "./AutonymExonymHeading";
import { getPeopleRoute } from "@/lib/routing";

interface PeoplesSectionProps {
  data: PeoplesData;
}

// @req REQ-092
export function PeoplesSection({ data }: PeoplesSectionProps) {
  if (data.rows.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-4 md:mb-4">
        <div>
          <div
            className="text-afh-h2 font-black leading-none"
            style={{
              fontFamily: "var(--country-font-display)",
              color: "var(--country-terracotta)",
            }}
          >
            {data.totalPopulationFormatted}
          </div>
          <div
            className="text-afh-caption mt-0.5"
            style={{ color: "var(--country-text-soft)" }}
          >
            habitants · 2025
          </div>
        </div>
        <div
          className="text-afh-h3 font-bold"
          style={{
            fontFamily: "var(--country-font-display)",
            color: "var(--country-text)",
          }}
        >
          {data.peopleCount}+ peuples
        </div>
      </div>

      {/* Visual demographic bar */}
      <DemoBar rows={data.rows} />
      <CoverageNote rows={data.rows} />

      {/* People rows */}
      <div className="mt-3 md:mt-4">
        {data.rows.map((row, i) => (
          <PeopleRowItem
            key={i}
            row={row}
            isLast={i === data.rows.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// DemoBar
// ==========================================

/**
 * Segments are sized as a share of the whole country, not stretched to
 * fill the bar. Under flex-grow the bar always reached the right-hand
 * edge, so a country whose documented peoples account for 60% of it read
 * exactly like one fully accounted for — the FR28 shortfall was being
 * hidden by the very chart meant to show it. The remainder is left empty
 * and named underneath.
 */
function DemoBar({ rows }: { rows: PeopleRow[] }) {
  const declared = declaredShare(rows);

  return (
    <div
      data-demo-bar=""
      data-declared-share={declared}
      className="flex h-3 md:h-4 xl:h-[18px] rounded-md xl:rounded-[9px] overflow-hidden"
      style={{ gap: "var(--country-bar-gap)" }}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            width: `${row.percentage}%`,
            background: getDemoColor(row.colorIndex),
          }}
          title={`${row.name} — ${row.percentage}%`}
        />
      ))}
    </div>
  );
}

/** How much of the country the fiche's peoples actually account for. */
// @req REQ-092
export function declaredShare(rows: PeopleRow[]): number {
  return Math.round(
    rows.reduce((total, row) => total + (row.percentage || 0), 0)
  );
}

/**
 * FR28: per-country shares are meant to sum to 100, and the validator now
 * fails the build outside [99, 101]. A fiche can still be read while its
 * splits are being re-sourced, so where the total falls short the page
 * says so rather than letting the bar imply full coverage.
 */
function CoverageNote({ rows }: { rows: PeopleRow[] }) {
  const declared = declaredShare(rows);
  if (declared >= 99) return null;

  return (
    <p
      data-demo-coverage-note=""
      className="mt-[6px] text-afh-eyebrow"
      style={{ color: "var(--country-text-soft)" }}
    >
      Les peuples documentés ici représentent {declared}&nbsp;% de la population
      du pays. Le reste n&apos;est pas encore réparti dans le corpus.
    </p>
  );
}

// ==========================================
// PeopleRowItem
// ==========================================

function PeopleRowItem({ row, isLast }: { row: PeopleRow; isLast: boolean }) {
  const dotColor = getDemoColor(row.colorIndex);

  return (
    <div
      className={`flex items-center gap-[10px] xl:gap-[14px] py-[10px] md:py-[12px] xl:py-[14px] ${
        !isLast ? "border-b" : ""
      }`}
      style={!isLast ? { borderBottomColor: "var(--country-border)" } : {}}
    >
      {/* Colored dot */}
      <div
        className="shrink-0 w-[10px] h-[10px] xl:w-3 xl:h-3 rounded-[3px] xl:rounded-[4px]"
        style={{ background: dotColor }}
      />

      {/* Info block */}
      <div className="flex-1 min-w-0">
        {/* Names row */}
        <div className="flex items-baseline gap-[6px] flex-wrap">
          {!row.groupedNames && row.endonym && row.endonym !== row.name ? (
            <AutonymExonymHeading
              endonym={row.endonym}
              exonym={row.name}
              lang={row.endonymLang}
              href={
                row.peopleId ? getPeopleRoute("fr", row.peopleId) : undefined
              }
            />
          ) : row.peopleId && !row.groupedNames ? (
            <Link
              href={getPeopleRoute("fr", row.peopleId)}
              className="text-afh-small font-bold leading-snug hover:underline"
              style={{ fontFamily: "var(--country-font-body)" }}
            >
              {row.name}
            </Link>
          ) : (
            <span
              className="text-afh-small font-bold leading-snug"
              style={{ fontFamily: "var(--country-font-body)" }}
            >
              {row.groupedNames ? row.groupedNames.join(" · ") : row.name}
            </span>
          )}
        </div>

        {/* Meta row */}
        {!row.isOther ? (
          <div
            className="text-afh-eyebrow mt-0.5"
            style={{ color: "var(--country-text-soft)" }}
          >
            {row.groupedNames ? (
              <>
                {row.groupedNames.length} peuples · {row.populationFormatted}
              </>
            ) : (
              [row.region, row.languageFamily].filter(Boolean).join(" · ")
            )}
          </div>
        ) : (
          <div
            className="text-afh-eyebrow mt-0.5"
            style={{ color: "var(--country-text-soft)" }}
          >
            Diversité ethnolinguistique
            <em> · non détaillée individuellement</em>
          </div>
        )}

        {/* Pejorative warning */}
        {row.pejorativeTerm && (
          <div className="mt-1">
            <span
              className="warn-colonial inline-flex text-afh-eyebrow font-bold px-[6px] py-[1px] rounded-[var(--country-radius-sm)] line-through"
              style={{
                color: "var(--country-colonial)",
                background: "var(--country-colonial-bg)",
              }}
            >
              {row.pejorativeTerm}
            </span>
          </div>
        )}
      </div>

      {/* Stats block */}
      <div className="text-right min-w-[50px] shrink-0">
        <div
          className="text-afh-h3 font-black leading-none"
          style={{
            fontFamily: "var(--country-font-display)",
            color: "var(--country-text)",
          }}
        >
          {row.percentage}%
        </div>
        <div
          className="text-afh-eyebrow mt-0.5"
          style={{ color: "var(--country-text-soft)" }}
        >
          {row.populationFormatted}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Helpers
// ==========================================

function getDemoColor(colorIndex: number): string {
  if (colorIndex === 0) return "var(--country-demo-other)";
  const clamped = Math.min(Math.max(colorIndex, 1), 10);
  return `var(--country-demo-${clamped})`;
}
