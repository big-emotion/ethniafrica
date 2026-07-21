import type { PeoplesData, PeopleRow } from "@/lib/countryDataTransformer";

interface PeoplesSectionProps {
  data: PeoplesData;
}

export function PeoplesSection({ data }: PeoplesSectionProps) {
  if (data.rows.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-4 md:mb-4">
        <div>
          <div
            className="text-[24px] md:text-[28px] xl:text-[32px] font-black leading-none"
            style={{
              fontFamily: "var(--country-font-display)",
              color: "var(--country-terracotta)",
            }}
          >
            {data.totalPopulationFormatted}
          </div>
          <div
            className="text-[11px] mt-0.5"
            style={{ color: "var(--country-text-soft)" }}
          >
            habitants · 2025
          </div>
        </div>
        <div
          className="text-[18px] md:text-[18px] xl:text-[20px] font-bold"
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

function DemoBar({ rows }: { rows: PeopleRow[] }) {
  return (
    <div
      className="flex h-3 md:h-4 xl:h-[18px] rounded-md xl:rounded-[9px] overflow-hidden"
      style={{ gap: "var(--country-bar-gap)" }}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            flex: row.percentage,
            background: getDemoColor(row.colorIndex),
          }}
          title={`${row.name} — ${row.percentage}%`}
        />
      ))}
    </div>
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
          <span
            className="text-[14px] md:text-[15px] xl:text-[16px] font-bold leading-snug"
            style={{ fontFamily: "var(--country-font-body)" }}
          >
            {row.groupedNames ? row.groupedNames.join(" · ") : row.name}
          </span>
          {!row.groupedNames && row.endonym && row.endonym !== row.name && (
            <span
              className="text-[11px] xl:text-[12px] italic"
              style={{ color: "var(--country-text-soft)" }}
            >
              {/* UX-DR49 violation, knowingly left in place: the endonym is
                  rendered subordinate to the exonym and without a lang
                  attribute. Routing it through <AutonymExonymHeading> changes
                  how peoples read on every country page, so it is a product
                  decision rather than a lint fix — tracked separately. */}
              {/* eslint-disable-next-line afh/no-bare-people-name */}
              {row.endonym}
            </span>
          )}
        </div>

        {/* Meta row */}
        {!row.isOther ? (
          <div
            className="text-[10px] xl:text-[11px] mt-0.5"
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
            className="text-[10px] xl:text-[11px] mt-0.5"
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
              className="warn-colonial inline-flex text-[9px] xl:text-[10px] font-bold px-[6px] py-[1px] rounded-[var(--country-radius-sm)] line-through"
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
          className="text-[18px] md:text-[20px] xl:text-[22px] font-black leading-none"
          style={{
            fontFamily: "var(--country-font-display)",
            color: "var(--country-text)",
          }}
        >
          {row.percentage}%
        </div>
        <div
          className="text-[10px] mt-0.5"
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
